import React from 'react'

export default function DashboardPage(){
  const greeting = () => 'Доброе утро, Ирочка ☀️'
  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">{greeting()}</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="p-4 bg-white rounded shadow">Карточка 1</div>
        <div className="p-4 bg-white rounded shadow">Карточка 2</div>
        <div className="p-4 bg-white rounded shadow">Карточка 3</div>
      </div>
    </div>
  )
}
