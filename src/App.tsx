import { Toaster } from "./components/ui/toaster";

import "./App.css";

function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between w-full bg-[radial-gradient(circle_at_1px_1px,_#8e8e8e8e_1px,_transparent_0)] [background-size:20px_20px] bg-repeat">
      <Toaster />
    </main>
  );
}

export default App;
