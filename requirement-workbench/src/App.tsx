import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Overview from './pages/Overview';
import Intake from './pages/Intake';
import Review from './pages/Review';
import Breakdown from './pages/Breakdown';
import Scoring from './pages/Scoring';
import Analysis from './pages/Analysis';
import ArchDesign from './pages/ArchDesign';
import ArchReview from './pages/ArchReview';
import DetailDesign from './pages/DetailDesign';
import Development from './pages/Development';
import Testing from './pages/Testing';
import Risks from './pages/Risks';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="intake" element={<Intake />} />
        <Route path="review" element={<Review />} />
        <Route path="breakdown" element={<Breakdown />} />
        <Route path="scoring" element={<Scoring />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="arch-design" element={<ArchDesign />} />
        <Route path="arch-review" element={<ArchReview />} />
        <Route path="detail-design" element={<DetailDesign />} />
        <Route path="development" element={<Development />} />
        <Route path="testing" element={<Testing />} />
        <Route path="risks" element={<Risks />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
