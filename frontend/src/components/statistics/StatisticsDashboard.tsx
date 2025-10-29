import React from 'react'

const StatCard = ({ title, value, change, isPositive }) => (
    <div className="flex min-w-[158px] flex-1 flex-col gap-2 rounded-xl bg-white p-6 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <p className="text-slate-600 dark:text-slate-400 text-base font-medium leading-normal">{title}</p>
        <p className="text-slate-800 dark:text-white tracking-tight text-3xl font-bold leading-tight">{value}</p>
        <p className={`${isPositive ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'} text-base font-medium leading-normal`}>{change}</p>
    </div>
)

const ChartCard = ({ title, subtitle, imgSrc, alt }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        <div className="mt-4 h-64 w-full">
            <img className="h-full w-full object-contain" src={imgSrc} alt={alt} />
        </div>
    </div>
)

const ActivityTable = () => {
    const activities = [
        { user: "Alex Johnson", agent: "SupportBot", timestamp: "2024-07-21 14:32:11", status: "Successful", statusColor: "green" },
        { user: "Maria Garcia", agent: "SalesPro", timestamp: "2024-07-21 14:28:45", status: "Escalated", statusColor: "yellow" },
        { user: "Chen Wei", agent: "OnboardingHelper", timestamp: "2024-07-21 14:25:03", status: "Successful", statusColor: "green" },
        { user: "David Miller", agent: "SupportBot", timestamp: "2024-07-21 14:21:59", status: "Failed", statusColor: "red" },
        { user: "Sophia Brown", agent: "TechAdvisor", timestamp: "2024-07-21 14:18:22", status: "Successful", statusColor: "green" },
    ];

    const statusClasses = {
        green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    }

    return (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent User Activity</h3>
            <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                    <thead className="text-xs uppercase text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                        <tr>
                            <th scope="col" className="px-6 py-3">User</th>
                            <th scope="col" className="px-6 py-3">Agent</th>
                            <th scope="col" className="px-6 py-3">Timestamp</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activities.map((activity, index) => (
                            <tr key={index} className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                                <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900 dark:text-white">{activity.user}</td>
                                <td className="px-6 py-4">{activity.agent}</td>
                                <td className="px-6 py-4">{activity.timestamp}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses[activity.statusColor]}`}>
                                        {activity.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-4 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-400">Showing 1 to 5 of 2,345 entries</span>
                <div className="inline-flex gap-1">
                    <button className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Previous</button>
                    <button className="inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Next</button>
                </div>
            </div>
        </div>
    )
}

export const StatisticsDashboard: React.FC = () => {
    return (
        <main className="flex-1 p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-slate-800 dark:text-slate-100 text-4xl font-black leading-tight tracking-[-0.033em] min-w-72">Dashboard</p>
                <div className="flex gap-2">
                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 pl-4 pr-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">Last 7 Days</p>
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 !text-xl">expand_more</span>
                    </button>
                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-slate-800 pl-4 pr-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <p className="text-slate-700 dark:text-slate-300 text-sm font-medium leading-normal">All Agents</p>
                        <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 !text-xl">expand_more</span>
                    </button>
                    <button className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary pl-4 pr-4 text-white hover:bg-primary/90">
                        <span className="material-symbols-outlined !text-xl">add</span>
                        <p className="text-sm font-medium leading-normal">Create Report</p>
                    </button>
                </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Users" value="1,428" change="+2.5%" isPositive={true} />
                <StatCard title="Active Agents" value="76" change="+1.8%" isPositive={true} />
                <StatCard title="Total Conversations" value="23,591" change="+15%" isPositive={true} />
                <StatCard title="Avg LLM Cost / Convo" value="$0.12" change="-3.2%" isPositive={false} />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <ChartCard
                        title="LLM Token Usage"
                        subtitle="Input vs. Output tokens over the last 7 days."
                        imgSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBQZd3JAYPJgGV1intgxQOVYbetRWR4xGq98Rl6edkQ4HdwyzTU7qQ3lmJUl8rGmf2GPfdy2OELDfgLwrvMftXX6rbWPade79pG9gneRSzIy7hKVFp3VkNIuKdirCt0YGEyZjmjOzSeyQoQHb7KtE2dXUCeXLvc6S2HTURZYFtnXsTzMYcUjlkRwQ6JLJoD0yrobBMGIDOtE9ImvnJszXdBC7dj47Cc-YZZOisAURkUS9Xqt0iaobpq7oqYP6sGS8UQTM0y5KJwW-Hy"
                        alt="Line chart showing LLM token usage"
                    />
                </div>
                <ChartCard
                    title="Conversation Outcomes"
                    subtitle="Breakdown by status."
                    imgSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBSMvR95jbqk5vTK39pCOiwwVW_pB2OS-Sq7Th2wuV9xEB8srAT_RggQT3mdIT_k_Rs1m6bVWXoNHLu45A1TQdaT8PfID5XokYHnVG9Sg07LEqw6qaWcWlhSVKaY77i3uEza_C-JTe7xrL6GknbK765ptaoyNxgJoCGhCU2VRO6lutLbJlrXqBBhqiEr8OFfuFzCJbLDXpjHi5yx2tfv5PrysOg4zLsDH_xgJgfWbScsU2kKQSM6fBVof_WjsQDzmrppqT9e7MVamUm"
                    alt="Donut chart showing conversation outcomes"
                />
            </div>
            <ActivityTable />
        </main>
    )
}