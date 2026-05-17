import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './Dashboard'
import CallLogs from './CallLogs'
import CreateAssistant from './CreateAssistant'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/call-logs" element={<CallLogs />} />
        <Route path="/create-assistant" element={<CreateAssistant />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App