import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Print from './pages/Print';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/print/:id" element={<Print />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
      </Routes>
    </HashRouter>
  );
}
