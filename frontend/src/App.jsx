import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home        from './pages/Home.jsx';
import Performance from './pages/Performance.jsx';
import Predictions from './pages/Predictions.jsx';
import History     from './pages/History.jsx';
import Blog        from './pages/Blog.jsx';
import BlogPost    from './pages/BlogPost.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/history"     element={<History />} />
        <Route path="/blog"        element={<Blog />} />
        <Route path="/blog/:slug"  element={<BlogPost />} />
        <Route path="*"            element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
