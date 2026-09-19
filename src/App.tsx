import { HashRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Print from './pages/Print';
import OrdersLayout from './orders/OrdersLayout';
import BoardPage from './orders/BoardPage';
import NewOrderPage from './orders/NewOrderPage';
import OrderDetailPage from './orders/OrderDetailPage';
import WorkersPage from './orders/WorkersPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:id" element={<Editor />} />
        <Route path="/print/:id" element={<Print />} />
        <Route path="/orders" element={<OrdersLayout />}>
          <Route index element={<BoardPage />} />
          <Route path="new" element={<NewOrderPage />} />
          <Route path="workers" element={<WorkersPage />} />
          <Route path=":id" element={<OrderDetailPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
