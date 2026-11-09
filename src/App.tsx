import { MainLayout } from './components/MainLayout';
import { usePromptStore } from './hooks/usePromptStore';

export default function App() {
  const store = usePromptStore();
  return <MainLayout store={store} />;
}
