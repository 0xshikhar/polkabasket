#![no_main]
#![no_std]

use uapi::{HostFn, HostFnImpl as api, ReturnFlags};

#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    unsafe {
        core::arch::asm!("unimp");
        core::hint::unreachable_unchecked();
    }
}

const SELECTOR_REBALANCE: [u8; 4] = [0xf4, 0x99, 0x30, 0x18];
const SELECTOR_OPTIMIZE: [u8; 4] = [0x8f, 0xa5, 0xf2, 0x5c];
const SELECTOR_YIELDS: [u8; 4] = [0x5e, 0x54, 0x0e, 0x6d];
const SELECTOR_VOLATILITY: [u8; 4] = [0x8d, 0x12, 0xf1, 0x9a];

const BPS_TOTAL: u16 = 10000;
const MAX_VOLATILITY_PENALTY: u16 = 2000;
const MIN_WEIGHT: u16 = 500;
const REBALANCE_THRESHOLD: u16 = 200;
const MAX_ALLOCATIONS: usize = 8;

const YIELD_HYDRATION: u16 = 1200;
const YIELD_MOONBEAM: u16 = 800;
const YIELD_ACALA: u16 = 1000;
const YIELD_DEFAULT: u16 = 600;

const VOL_HYDRATION: u16 = 500;
const VOL_MOONBEAM: u16 = 800;
const VOL_ACALA: u16 = 1000;
const VOL_DEFAULT: u16 = 1200;

const PARA_HYDRATION: u32 = 2034;
const PARA_MOONBEAM: u32 = 2004;
const PARA_ACALA: u32 = 2000;

fn read_u16(input: &[u8], slot: usize) -> u16 {
    let offset = slot * 32 + 30;
    u16::from_be_bytes([input[offset], input[offset + 1]])
}

fn read_u32(input: &[u8], slot: usize) -> u32 {
    let offset = slot * 32 + 28;
    u32::from_be_bytes([
        input[offset],
        input[offset + 1],
        input[offset + 2],
        input[offset + 3],
    ])
}

fn read_u128(input: &[u8], slot: usize) -> u128 {
    let offset = slot * 32 + 16;
    u128::from_be_bytes(input[offset..offset + 16].try_into().unwrap())
}

fn write_u16(output: &mut [u8], slot: usize, val: u16) {
    let bytes = val.to_be_bytes();
    output[slot * 32 + 30..slot * 32 + 32].copy_from_slice(&bytes);
}

fn write_u32(output: &mut [u8], slot: usize, val: u32) {
    let bytes = val.to_be_bytes();
    output[slot * 32 + 28..slot * 32 + 32].copy_from_slice(&bytes);
}

fn get_default_yield(para_id: u32) -> u16 {
    match para_id {
        PARA_HYDRATION => YIELD_HYDRATION,
        PARA_MOONBEAM => YIELD_MOONBEAM,
        PARA_ACALA => YIELD_ACALA,
        _ => YIELD_DEFAULT,
    }
}

fn get_default_volatility(para_id: u32) -> u16 {
    match para_id {
        PARA_HYDRATION => VOL_HYDRATION,
        PARA_MOONBEAM => VOL_MOONBEAM,
        PARA_ACALA => VOL_ACALA,
        _ => VOL_DEFAULT,
    }
}

fn calculate_risk_score(yield_bps: u16, volatility_bps: u16) -> u16 {
    let risk = (volatility_bps as u32 * 1000) / (1000 + yield_bps as u32 / 10);
    risk as u16
}

fn optimize_weights_internal(
    weights: &[u16; MAX_ALLOCATIONS],
    para_ids: &[u32; MAX_ALLOCATIONS],
    count: usize,
) -> [u16; MAX_ALLOCATIONS] {
    let mut new_weights = [0u16; MAX_ALLOCATIONS];

    if count == 0 {
        return new_weights;
    }

    let mut yields = [0u16; MAX_ALLOCATIONS];
    let mut risk_scores = [0u16; MAX_ALLOCATIONS];
    let mut total_score: u32 = 0;

    for i in 0..count {
        let yield_bps = get_default_yield(para_ids[i]);
        let vol_bps = get_default_volatility(para_ids[i]);
        yields[i] = yield_bps;
        risk_scores[i] = calculate_risk_score(yield_bps, vol_bps);

        let adj_yield = (weights[i] as u32
            * yields[i] as u32
            * (MAX_VOLATILITY_PENALTY as u32 - risk_scores[i] as u32))
            / (MAX_VOLATILITY_PENALTY as u32 * 100);
        total_score += adj_yield;
    }

    if total_score == 0 {
        let equal_weight = BPS_TOTAL / count as u16;
        for i in 0..count {
            new_weights[i] = equal_weight;
        }
    } else {
        let mut total_weight: u16 = 0;
        for i in 0..count {
            let adj_yield = (weights[i] as u32
                * yields[i] as u32
                * (MAX_VOLATILITY_PENALTY as u32 - risk_scores[i] as u32))
                / (MAX_VOLATILITY_PENALTY as u32 * 100);
            let weight = ((adj_yield * BPS_TOTAL as u32) / total_score) as u16;
            new_weights[i] = if weight < MIN_WEIGHT {
                MIN_WEIGHT
            } else {
                weight
            };
            total_weight += new_weights[i];
        }

        if total_weight != BPS_TOTAL && count > 0 {
            let diff = BPS_TOTAL - total_weight;
            let mut max_idx = 0;
            let mut max_weight = 0u16;
            for i in 0..count {
                if new_weights[i] > max_weight {
                    max_weight = new_weights[i];
                    max_idx = i;
                }
            }
            new_weights[max_idx] += diff;
        }
    }

    new_weights
}

fn apply_threshold_internal(
    current: &[u16; MAX_ALLOCATIONS],
    target: &[u16; MAX_ALLOCATIONS],
    count: usize,
    threshold: u16,
) -> [u16; MAX_ALLOCATIONS] {
    let mut result = [0u16; MAX_ALLOCATIONS];

    for i in 0..count {
        let diff = if current[i] > target[i] {
            current[i] - target[i]
        } else {
            target[i] - current[i]
        };

        result[i] = if diff > threshold {
            target[i]
        } else {
            current[i]
        };
    }

    result
}

fn encode_u16_array_fixed(values: &[u16; MAX_ALLOCATIONS], count: usize) -> [u8; 320] {
    let mut output = [0u8; 320];

    write_u32(&mut output, 0, 32);
    write_u32(&mut output, 1, count as u32);

    for i in 0..count {
        write_u16(&mut output, 2 + i, values[i]);
    }

    output
}

#[no_mangle]
#[polkavm_derive::polkavm_export]
pub extern "C" fn deploy() {}

#[no_mangle]
#[polkavm_derive::polkavm_export]
pub extern "C" fn call() {
    let mut selector = [0u8; 4];
    api::call_data_copy(&mut selector, 0);

    if selector == SELECTOR_REBALANCE {
        handle_rebalance();
    } else if selector == SELECTOR_OPTIMIZE {
        handle_optimize();
    } else if selector == SELECTOR_YIELDS {
        handle_get_yields();
    } else if selector == SELECTOR_VOLATILITY {
        handle_get_volatility();
    } else {
        api::return_value(ReturnFlags::REVERT, &[]);
    }
}

fn handle_rebalance() {
    let input_len = api::call_data_size();
    if input_len < 36 {
        api::return_value(ReturnFlags::REVERT, &[]);
    }

    let mut input = [0u8; 320];
    api::call_data_copy(&mut input, 4);

    let weights_offset = read_u32(&input, 0) as usize;
    let _total_deposited = read_u128(&input, 1);
    let para_ids_offset = read_u32(&input, 2) as usize;

    let weights_len = read_u32(&input, weights_offset / 32) as usize;
    let count = weights_len.min(MAX_ALLOCATIONS);

    let mut weights = [0u16; MAX_ALLOCATIONS];
    let mut para_ids = [0u32; MAX_ALLOCATIONS];

    for i in 0..count {
        weights[i] = read_u16(&input, weights_offset / 32 + 1 + i);
    }

    for i in 0..count {
        para_ids[i] = read_u32(&input, para_ids_offset / 32 + 1 + i);
    }

    let optimized = optimize_weights_internal(&weights, &para_ids, count);
    let final_weights = apply_threshold_internal(&weights, &optimized, count, REBALANCE_THRESHOLD);

    let output = encode_u16_array_fixed(&final_weights, count);
    let output_len = 32 + 32 + count * 32;
    api::return_value(ReturnFlags::empty(), &output[..output_len]);
}

fn handle_optimize() {
    let input_len = api::call_data_size();
    if input_len < 36 {
        api::return_value(ReturnFlags::REVERT, &[]);
    }

    let mut input = [0u8; 320];
    api::call_data_copy(&mut input, 4);

    let weights_offset = read_u32(&input, 0) as usize;
    let para_ids_offset = read_u32(&input, 1) as usize;

    let weights_len = read_u32(&input, weights_offset / 32) as usize;
    let count = weights_len.min(MAX_ALLOCATIONS);

    let mut weights = [0u16; MAX_ALLOCATIONS];
    let mut para_ids = [0u32; MAX_ALLOCATIONS];

    for i in 0..count {
        weights[i] = read_u16(&input, weights_offset / 32 + 1 + i);
    }

    for i in 0..count {
        para_ids[i] = read_u32(&input, para_ids_offset / 32 + 1 + i);
    }

    let optimized = optimize_weights_internal(&weights, &para_ids, count);
    let output = encode_u16_array_fixed(&optimized, count);
    let output_len = 32 + 32 + count * 32;
    api::return_value(ReturnFlags::empty(), &output[..output_len]);
}

fn handle_get_yields() {
    let input_len = api::call_data_size();
    if input_len < 36 {
        api::return_value(ReturnFlags::REVERT, &[]);
    }

    let mut input = [0u8; 320];
    api::call_data_copy(&mut input, 4);

    let para_ids_offset = read_u32(&input, 0) as usize;
    let para_ids_len = read_u32(&input, para_ids_offset / 32) as usize;
    let count = para_ids_len.min(MAX_ALLOCATIONS);

    let mut yields = [0u16; MAX_ALLOCATIONS];
    for i in 0..count {
        let para_id = read_u32(&input, para_ids_offset / 32 + 1 + i);
        yields[i] = get_default_yield(para_id);
    }

    let output = encode_u16_array_fixed(&yields, count);
    let output_len = 32 + 32 + count * 32;
    api::return_value(ReturnFlags::empty(), &output[..output_len]);
}

fn handle_get_volatility() {
    let input_len = api::call_data_size();
    if input_len < 36 {
        api::return_value(ReturnFlags::REVERT, &[]);
    }

    let mut input = [0u8; 320];
    api::call_data_copy(&mut input, 4);

    let para_ids_offset = read_u32(&input, 0) as usize;
    let para_ids_len = read_u32(&input, para_ids_offset / 32) as usize;
    let count = para_ids_len.min(MAX_ALLOCATIONS);

    let mut volatilities = [0u16; MAX_ALLOCATIONS];
    for i in 0..count {
        let para_id = read_u32(&input, para_ids_offset / 32 + 1 + i);
        volatilities[i] = get_default_volatility(para_id);
    }

    let output = encode_u16_array_fixed(&volatilities, count);
    let output_len = 32 + 32 + count * 32;
    api::return_value(ReturnFlags::empty(), &output[..output_len]);
}
