import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./layouts/Layout";
import { HomePage } from "./pages/HomePage";
import { BasketsPage } from "./pages/BasketsPage";
import { BasketPage } from "./pages/BasketPage";
import { PortfolioPage } from "./pages/PortfolioPage";

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/baskets" element={<BasketsPage />} />
          <Route path="/basket/:id" element={<BasketPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
