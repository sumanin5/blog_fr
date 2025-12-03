import { useState, useEffect } from 'react'

// 后端 API 地址
const API_URL = 'http://localhost:8000'

function App() {
  // 存储从后端获取的数据
  const [message, setMessage] = useState<string>('加载中...')
  const [error, setError] = useState<string | null>(null)

  // 组件加载时请求后端
  useEffect(() => {
    fetchBackend()
  }, [])

  // 请求后端 API
  const fetchBackend = async () => {
    try {
      const response = await fetch(`${API_URL}/`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setMessage(JSON.stringify(data, null, 2))
      setError(null)
    } catch (err) {
      setError(`请求失败: ${err}`)
      setMessage('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">🚀 Blog FR</h1>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4">后端连接测试</h2>

          {error ? (
            <p className="text-red-400 bg-red-900/20 p-4 rounded-lg">{error}</p>
          ) : (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm">
              {message}
            </pre>
          )}

          <button
            onClick={fetchBackend}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            刷新数据
          </button>
        </div>

        <p className="text-center text-gray-500 mt-6 text-sm">
          前端: <code className="bg-gray-800 px-2 py-1 rounded text-green-400">localhost:5173</code> |
          后端: <code className="bg-gray-800 px-2 py-1 rounded text-green-400">localhost:8000</code>
        </p>
      </div>
    </div>
  )
}

export default App
