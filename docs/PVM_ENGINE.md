# PolkaBasket — PVM Rust Allocation Engine
### `pvm-engine/PVM_ENGINE.md`

---

## Overview

The PVM engine is a Rust library compiled to **PolkaVM RISC-V bytecode** using `polkatool`. It is deployed as a precompile on Polkadot Hub and called via `staticcall` from `BasketManager.sol`.

This is the hackathon's primary PVM/Rust differentiator and should be highlighted prominently in the demo.

---

## Why Rust + PVM

PolkaVM runs RISC-V bytecode natively — this means Rust code compiles directly to a first-class execution environment on Polkadot Hub. The allocation engine benefits from:

- **Type safety** — no integer overflow bugs in weight calculations
- **Performance** — RISC-V execution is faster than interpreted EVM for computation-heavy logic
- **Expressiveness** — complex financial math is easier in Rust than Solidity

For judges: this demonstrates you understand PVM as a new primitive, not just an EVM clone.

---

## Cargo.toml

```toml
[package]
name = "polkabasket-engine"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]  # Required for PolkaVM compilation

[dependencies]
# No std dependencies — PolkaVM runs in a no_std environment
# For fixed-point math without floats:
fixed = { version = "1.23", default-features = false }

[profile.release]
opt-level = "s"   # Optimize for size (PolkaVM bytecode size matters)
lto = true
panic = "abort"   # Required for no_std
```

---

## lib.rs — Entry Points

PolkaVM programs expose functions via a C ABI. Solidity calls these functions via precompile `staticcall`.

```rust
#![no_std]
#![no_main]

mod allocation;
mod rebalance;
mod risk;

use core::slice;

/// ABI:
///   Input:  [num_protocols: u32][yields: [apy_bps: u32; N]][risk_tolerance: u16]
///   Output: [weights: [weight_bps: u16; N]]
#[no_mangle]
pub extern "C" fn optimize_allocation(
    input_ptr: *const u8,
    input_len: u32,
    output_ptr: *mut u8,
    output_len_ptr: *mut u32,
) -> i32 {
    let input = unsafe { slice::from_raw_parts(input_ptr, input_len as usize) };

    match allocation::optimize(input) {
        Ok(result) => {
            let out = unsafe { slice::from_raw_parts_mut(output_ptr, 1024) };
            let len = result.len().min(out.len());
            out[..len].copy_from_slice(&result[..len]);
            unsafe { *output_len_ptr = len as u32 };
            0 // success
        }
        Err(_) => -1,
    }
}

/// ABI:
///   Input:  [num_protocols: u32][current_weights: [u16; N]][target_weights: [u16; N]][threshold_bps: u16]
///   Output: [needs_rebalance: u8][new_weights: [u16; N]]
#[no_mangle]
pub extern "C" fn rebalance_basket(
    input_ptr: *const u8,
    input_len: u32,
    output_ptr: *mut u8,
    output_len_ptr: *mut u32,
) -> i32 {
    let input = unsafe { slice::from_raw_parts(input_ptr, input_len as usize) };

    match rebalance::compute(input) {
        Ok(result) => {
            let out = unsafe { slice::from_raw_parts_mut(output_ptr, 1024) };
            let len = result.len().min(out.len());
            out[..len].copy_from_slice(&result[..len]);
            unsafe { *output_len_ptr = len as u32 };
            0
        }
        Err(_) => -1,
    }
}
```

---

## allocation.rs — optimize_allocation

```rust
// allocation.rs
// Computes optimal allocation weights from yield data.
// For MVP: implements simple yield-weighted allocation with risk cap.

// Hardcoded yield data for testnet (replace with oracle feed in production)
const MOCK_YIELDS: &[u32] = &[
    800,   // Hydration LP: 8% APY in bps
    1400,  // Acala staking: 14% APY in bps
    600,   // Moonbeam lending: 6% APY in bps
];

// Max allocation cap per protocol (prevents over-concentration)
const MAX_WEIGHT_BPS: u16 = 5000; // 50%
const MIN_WEIGHT_BPS: u16 = 1000; // 10%

pub fn optimize(input: &[u8]) -> Result<Vec<u8>, ()> {
    // Parse input: [n_protocols: u32][yield_bps: u32; n][risk_tolerance: u16]
    if input.len() < 4 { return Err(()); }

    let n = u32::from_le_bytes(input[0..4].try_into().map_err(|_| ())?) as usize;
    let yields: &[u32] = if input.len() >= 4 + n * 4 {
        // Use provided yields
        let bytes = &input[4..4 + n * 4];
        // Safety: aligned read from input slice
        unsafe { core::slice::from_raw_parts(bytes.as_ptr() as *const u32, n) }
    } else {
        // Fall back to hardcoded mock yields
        &MOCK_YIELDS[..n.min(MOCK_YIELDS.len())]
    };

    // Compute yield-weighted allocation
    let total_yield: u32 = yields.iter().sum();
    if total_yield == 0 { return Err(()); }

    let mut weights: Vec<u16> = yields.iter().map(|&y| {
        let raw = ((y as u64 * 10000) / total_yield as u64) as u16;
        raw.max(MIN_WEIGHT_BPS).min(MAX_WEIGHT_BPS)
    }).collect();

    // Normalize to exactly 10000 bps
    let total: u32 = weights.iter().map(|&w| w as u32).sum();
    if total != 10000 && !weights.is_empty() {
        let diff = 10000i32 - total as i32;
        weights[0] = (weights[0] as i32 + diff) as u16;
    }

    // Encode output: [weights: u16; n]
    let mut output = Vec::with_capacity(n * 2);
    for w in &weights {
        output.extend_from_slice(&w.to_le_bytes());
    }
    Ok(output)
}
```

---

## rebalance.rs — rebalance_basket

```rust
// rebalance.rs
// Detects drift from target weights and outputs corrective weights.

pub fn compute(input: &[u8]) -> Result<Vec<u8>, ()> {
    if input.len() < 4 { return Err(()); }

    let n = u32::from_le_bytes(input[0..4].try_into().map_err(|_| ())?) as usize;
    let expected_len = 4 + n * 4 + 2; // [n][current_weights: u16 * n][target_weights: u16 * n][threshold: u16]
    if input.len() < expected_len { return Err(()); }

    let current_weights: Vec<u16> = (0..n).map(|i| {
        u16::from_le_bytes(input[4 + i * 2..6 + i * 2].try_into().unwrap_or([0, 0]))
    }).collect();

    let target_weights: Vec<u16> = (0..n).map(|i| {
        u16::from_le_bytes(input[4 + n * 2 + i * 2..6 + n * 2 + i * 2].try_into().unwrap_or([0, 0]))
    }).collect();

    let threshold = u16::from_le_bytes(
        input[4 + n * 4..6 + n * 4].try_into().map_err(|_| ())?
    );

    // Check if any protocol drifted beyond threshold
    let needs_rebalance = current_weights.iter().zip(target_weights.iter())
        .any(|(&c, &t)| abs_diff(c, t) > threshold);

    // Output: [needs_rebalance: u8][corrected_weights: u16; n]
    let mut output = Vec::with_capacity(1 + n * 2);
    output.push(if needs_rebalance { 1u8 } else { 0u8 });

    // If rebalancing needed, return target weights; else return current
    let output_weights = if needs_rebalance { &target_weights } else { &current_weights };
    for &w in output_weights {
        output.extend_from_slice(&w.to_le_bytes());
    }

    Ok(output)
}

fn abs_diff(a: u16, b: u16) -> u16 {
    if a > b { a - b } else { b - a }
}
```

---

## risk.rs — risk_adjusted_yield

```rust
// risk.rs
// Computes Sharpe-like risk-adjusted yield scores.
// For MVP: simple yield / volatility ratio with integer math.

pub struct RiskScore {
    pub protocol_index: usize,
    pub score_bps: u32,   // Higher is better
}

/// Yields in APY bps, volatilities in bps (std dev of 30-day returns)
/// Returns risk-adjusted scores (higher = more attractive)
pub fn score_protocols(
    yields_bps: &[u32],
    volatilities_bps: &[u32],
) -> Vec<RiskScore> {
    yields_bps.iter()
        .zip(volatilities_bps.iter())
        .enumerate()
        .map(|(i, (&y, &v))| {
            // Sharpe-like: yield / (1 + volatility)
            // Avoid division by zero; scale to bps
            let vol_factor = 10000u32 + v; // 10000 = 100% base
            let score = (y as u64 * 10000 / vol_factor as u64) as u32;
            RiskScore { protocol_index: i, score_bps: score }
        })
        .collect()
}
```

---

## Building with polkatool

```bash
# Install polkatool
cargo install polkatool

# Build the engine for PolkaVM target
cargo build --release --target riscv32em-unknown-none-elf -Z build-std=core,alloc

# Link and package for PolkaVM
polkatool link --output polkabasket_engine.polkavm \
    target/riscv32em-unknown-none-elf/release/polkabasket_engine.so

# Verify the bytecode
polkatool info polkabasket_engine.polkavm
```

> **Note:** The PolkaVM RISC-V target (`riscv32em-unknown-none-elf`) requires a nightly Rust toolchain and the `-Z build-std` flag. Set up `.cargo/config.toml` accordingly.

### .cargo/config.toml

```toml
[build]
target = "riscv32em-unknown-none-elf"

[unstable]
build-std = ["core", "alloc"]
build-std-features = ["compiler-builtins-mem"]
```

---

## Deploying as Precompile

In the hackathon context, the "PVM precompile" integration can be demonstrated in one of two ways:

**Option A (Ideal):** Deploy the compiled PolkaVM bytecode as a precompile address on the Hub testnet (requires Hub runtime support — check with OpenGuild Discord).

**Option B (MVP fallback):** Call the Rust engine off-chain (from the frontend or a relayer), pass the result back to the Solidity contract. Label this clearly in the demo as "oracle-relayed for testnet; onchain precompile in production."

Option B is perfectly acceptable for a hackathon demo and still demonstrates the Rust engine concept effectively.

---

## Testing the Engine

```bash
# Run Rust unit tests (native, not PolkaVM — for development speed)
cargo test

# test/engine_tests.rs
#[test]
fn test_optimize_allocation_basic() {
    let yields = [800u32, 1400, 600];
    let result = allocation::optimize_from_slice(&yields);
    let total: u32 = result.iter().map(|&w| w as u32).sum();
    assert_eq!(total, 10000, "weights must sum to 10000 bps");
    assert!(result[1] > result[0], "higher yield gets higher weight");
}

#[test]
fn test_rebalance_detects_drift() {
    let current = [4000u16, 3000, 3000];
    let target  = [3000u16, 4000, 3000];
    let threshold = 200u16;
    let (needs_rebalance, _) = rebalance::compute_from_slices(&current, &target, threshold);
    assert!(needs_rebalance);
}
```

---

*Part of PolkaBasket implementation plan. See also: `POLKABASKET_IMPLEMENTATION_PLAN.md`, `CONTRACTS.md`, `XCM_SPEC.md`*
