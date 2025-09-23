// community/src/app/routes.jsx
import { Navigate, useRoutes } from 'react-router-dom';
import CommunityList from '../features/qna/pages/CommunityList.jsx';
import QuestionDetail from '../features/qna/pages/QuestionDetail.jsx';
import AskQuestion from '../features/qna/pages/AskQuestion.jsx';
import Experts from '../features/qna/pages/Experts.jsx';

export default function RouterView() {
    return useRoutes([
        { path: '/', element: <Navigate to="/community" replace /> },
        { path: '/community', element: <CommunityList /> },
        { path: '/questions/:id', element: <QuestionDetail /> },
        { path: '/ask', element: <AskQuestion /> },
        { path: '/experts', element: <Experts /> },
    ]);
}
