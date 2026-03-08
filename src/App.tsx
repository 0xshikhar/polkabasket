import "./App.css";
import polkadotLogo from "./assets/polkadot-logo.svg";
import { BasketPage } from "./BasketPage";

const DEFAULT_BASKET_ID = 0n;

function App() {
  return (
    <div>
      <img src={polkadotLogo} className="logo mx-auto h-52 p-4" alt="Polkadot logo" />
      <div className="container mx-auto p-2 leading-6">
        <BasketPage basketId={DEFAULT_BASKET_ID} walletClient={null} />
      </div>
    </div>
  );
}

export default App;
