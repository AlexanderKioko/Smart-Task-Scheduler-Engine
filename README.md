# 🚀 Smart Task Scheduler Engine

An intelligent task scheduling and automation system written in pure JavaScript. Features dependency management, priority-based execution, workflow orchestration, and automated scheduling with cron-like capabilities.

## Features

- **Intelligent Task Scheduling**: Priority-based execution with dependency resolution
- **Workflow Orchestration**: Sequential and parallel task execution workflows
- **Multiple Schedule Types**: One-time, recurring, and cron-based scheduling
- **Dependency Management**: Automatic dependency resolution and execution ordering
- **Retry Logic**: Configurable retry attempts with exponential backoff
- **Real-time Analytics**: Comprehensive task performance metrics and reporting
- **Automation Engine**: Event-driven automations with custom triggers
- **Import/Export**: Save and restore task configurations
- **Memory Efficient**: Automatic cleanup of execution history

## Quick Start

```javascript
// Create a task
const task = scheduler.createTask({
    name: 'Data Backup',
    priority: 'HIGH',
    executor: () => console.log('Backing up data...'),
    timeout: 30000,
    retries: 2
});

// Schedule it to run every hour
scheduler.scheduleTask(task.id, {
    mode: 'RECURRING',
    interval: 3600000 // 1 hour in milliseconds
});

// Execute immediately
scheduler.executeTask(task.id);
```

## Core Concepts

### Task Creation

```javascript
const task = scheduler.createTask({
    name: 'Process Orders',
    description: 'Process pending customer orders',
    priority: 'CRITICAL', // CRITICAL, HIGH, MEDIUM, LOW, BACKGROUND
    
    // Execution function
    executor: async (task) => {
        console.log(`Processing orders for ${task.name}`);
        return 'Orders processed successfully';
    },
    
    // Configuration
    timeout: 60000,        // 60 second timeout
    retries: 3,           // Retry 3 times on failure
    estimatedDuration: 5000, // Expected runtime
    
    // Dependencies
    dependencies: [otherTaskId], // Wait for these tasks
    
    // Metadata
    category: 'business',
    tags: ['orders', 'processing', 'critical']
});
```

### Scheduling Options

```javascript
// One-time execution
scheduler.scheduleTask(taskId, {
    mode: 'ONCE',
    executeAt: new Date('2025-01-01 09:00:00')
});

// Recurring execution
scheduler.scheduleTask(taskId, {
    mode: 'RECURRING',
    interval: 86400000, // Every 24 hours
    maxExecutions: 30   // Stop after 30 runs
});

// Cron-style scheduling
scheduler.scheduleTask(taskId, {
    mode: 'CRON',
    cronExpression: '0 9 * * 1-5' // 9 AM on weekdays
});
```

### Workflow Management

```javascript
// Create a workflow
const workflow = scheduler.createWorkflow({
    name: 'Daily Data Pipeline',
    taskIds: [extractTaskId, transformTaskId, loadTaskId],
    parallelExecution: false,    // Sequential execution
    continueOnError: true        // Don't stop on task failure
});

// Execute the entire workflow
scheduler.executeWorkflow(workflow.id);
```

## Priority System

Tasks are executed based on priority levels:

| Priority | Value | Use Case |
|----------|-------|----------|
| **CRITICAL** | 5 | System maintenance, security updates |
| **HIGH** | 4 | Business-critical operations |
| **MEDIUM** | 3 | Regular business tasks |
| **LOW** | 2 | Optimization, cleanup tasks |
| **BACKGROUND** | 1 | Logging, analytics processing |

## Task States

```javascript
// Task lifecycle states
{
    PENDING: 'pending',     // Ready to execute
    RUNNING: 'running',     // Currently executing
    COMPLETED: 'completed', // Successfully finished
    FAILED: 'failed',       // Execution failed
    CANCELLED: 'cancelled', // Manually cancelled
    WAITING: 'waiting'      // Waiting for dependencies
}
```

## Advanced Features

### Dependency Management

```javascript
// Create dependent tasks
const dbBackup = scheduler.createTask({
    name: 'Database Backup',
    executor: () => backupDatabase()
});

const dataAnalysis = scheduler.createTask({
    name: 'Data Analysis',
    dependencies: [dbBackup.id], // Wait for backup to complete
    executor: () => analyzeData()
});

// Analysis will automatically run after backup completes
scheduler.executeTask(dbBackup.id);
```

### Automation Engine

```javascript
// Create event-driven automation
scheduler.createAutomation(
    'Disk Space Monitor',
    
    // Trigger condition
    () => getDiskUsage() > 0.9,
    
    // Actions to execute
    [
        () => console.log('🚨 Disk space critical!'),
        () => scheduler.executeTask(cleanupTaskId),
        () => sendAlert('disk-space-critical')
    ]
);
```

### Task Analytics

```javascript
const analytics = scheduler.getTaskAnalytics();

console.log(analytics);
// {
//   totalTasks: 15,
//   statusDistribution: { completed: 10, failed: 2, pending: 3 },
//   priorityDistribution: { HIGH: 5, MEDIUM: 8, LOW: 2 },
//   averageExecutionTime: 2347,
//   successRate: 87,
//   mostFailedTasks: [{ name: 'Flaky API Call', failures: 5 }],
//   upcomingTasks: [...]
// }
```

## API Reference

### Core Methods

| Method | Description |
|--------|-------------|
| `createTask(config)` | Create a new task with configuration |
| `executeTask(taskId)` | Execute a specific task |
| `scheduleTask(taskId, schedule)` | Schedule task execution |
| `createWorkflow(config)` | Create a task workflow |
| `executeWorkflow(workflowId)` | Execute an entire workflow |

### Task Management

| Method | Description |
|--------|-------------|
| `pauseTask(taskId)` | Pause a pending task |
| `resumeTask(taskId)` | Resume a paused task |
| `cancelTask(taskId)` | Cancel a task permanently |
| `optimizeSchedule()` | Optimize task execution order |

### Analytics & Monitoring

| Method | Description |
|--------|-------------|
| `getTaskAnalytics()` | Get comprehensive task statistics |
| `getTasksByPriority()` | Get tasks grouped by priority level |
| `exportTasks()` | Export all tasks and configurations |
| `importTasks(data)` | Import tasks from exported data |

### Automation

| Method | Description |
|--------|-------------|
| `createAutomation(name, trigger, actions)` | Create event-driven automation |
| `startScheduler()` | Start the main scheduling engine |
| `stopScheduler()` | Stop all scheduling and automations |

## Configuration Examples

### Complex Task with Dependencies

```javascript
const complexTask = scheduler.createTask({
    name: 'Generate Monthly Report',
    description: 'Compile and generate monthly business report',
    priority: 'HIGH',
    
    // Wait for data collection tasks
    dependencies: [salesDataTaskId, inventoryTaskId, customerTaskId],
    
    executor: async (task) => {
        const reportData = await compileMonthlyData();
        const pdf = await generatePDF(reportData);
        await emailReport(pdf);
        return { reportGenerated: true, fileSize: pdf.size };
    },
    
    timeout: 300000,  // 5 minutes
    retries: 2,
    estimatedDuration: 120000, // 2 minutes expected
    
    category: 'reporting',
    tags: ['monthly', 'business', 'pdf', 'email']
});
```

### Parallel Workflow

```javascript
const parallelWorkflow = scheduler.createWorkflow({
    name: 'Data Processing Pipeline',
    description: 'Process multiple data streams simultaneously',
    taskIds: [
        processCustomerDataTaskId,
        processOrderDataTaskId,
        processInventoryTaskId,
        processAnalyticsTaskId
    ],
    parallelExecution: true,  // Run all tasks simultaneously
    continueOnError: false    // Stop if any task fails
});

// Execute all tasks in parallel
await scheduler.executeWorkflow(parallelWorkflow.id);
```

### Smart Automation

```javascript
// Monitor system health and take action
scheduler.createAutomation(
    'System Health Monitor',
    
    // Check every 10 seconds
    () => {
        const metrics = getSystemMetrics();
        return metrics.cpu > 0.8 || metrics.memory > 0.9;
    },
    
    // Remediation actions
    [
        () => console.log('⚠️ System resources critical'),
        () => scheduler.executeTask(cleanupTempFilesTaskId),
        () => scheduler.executeTask(optimizeDatabaseTaskId),
        () => notifySystemAdmin('High resource usage detected')
    ]
);
```

## Real-World Use Cases

### 1. Data Pipeline Automation

```javascript
// ETL Pipeline
const extractTask = scheduler.createTask({
    name: 'Extract Data',
    executor: () => extractFromDatabase(),
    priority: 'HIGH'
});

const transformTask = scheduler.createTask({
    name: 'Transform Data',
    dependencies: [extractTask.id],
    executor: () => transformData(),
    priority: 'HIGH'
});

const loadTask = scheduler.createTask({
    name: 'Load Data',
    dependencies: [transformTask.id],
    executor: () => loadToWarehouse(),
    priority: 'HIGH'
});

// Schedule daily at 2 AM
[extractTask, transformTask, loadTask].forEach(task => {
    scheduler.scheduleTask(task.id, {
        mode: 'CRON',
        cronExpression: '0 2 * * *'
    });
});
```

### 2. System Maintenance

```javascript
// Scheduled maintenance tasks
const maintenanceTasks = [
    {
        name: 'Database Cleanup',
        executor: () => cleanOldRecords(),
        schedule: { mode: 'CRON', cronExpression: '0 3 * * 0' } // Weekly
    },
    {
        name: 'Log Rotation',
        executor: () => rotateLogs(),
        schedule: { mode: 'RECURRING', interval: 86400000 } // Daily
    },
    {
        name: 'Security Scan',
        executor: () => runSecurityScan(),
        schedule: { mode: 'CRON', cronExpression: '0 1 * * 1' } // Monday 1 AM
    }
];

maintenanceTasks.forEach(config => {
    const task = scheduler.createTask({
        name: config.name,
        executor: config.executor,
        priority: 'MEDIUM',
        category: 'maintenance'
    });
    
    scheduler.scheduleTask(task.id, config.schedule);
});
```

### 3. Business Process Automation

```javascript
// Order processing workflow
const orderWorkflow = scheduler.createWorkflow({
    name: 'Order Processing',
    taskIds: [
        validateOrderTaskId,
        checkInventoryTaskId,
        processPaymentTaskId,
        updateInventoryTaskId,
        sendConfirmationTaskId
    ],
    parallelExecution: false,
    continueOnError: false
});

// Trigger when new orders arrive
scheduler.createAutomation(
    'New Order Processing',
    () => hasNewOrders(),
    [() => scheduler.executeWorkflow(orderWorkflow.id)]
);
```

## Performance Optimization

### Memory Management

The scheduler automatically manages memory by:
- Limiting execution history to 1000 records
- Cleaning up completed one-time schedules
- Garbage collecting unused task references

### Execution Optimization

```javascript
// Optimize task execution order
const optimizedTasks = scheduler.optimizeSchedule();

// Tasks are ordered by:
// 1. Priority level (CRITICAL → BACKGROUND)
// 2. Estimated duration (shorter tasks first)
// 3. Dependency resolution
```

## Error Handling

### Task Failure Recovery

```javascript
const resilientTask = scheduler.createTask({
    name: 'API Data Sync',
    executor: async () => {
        try {
            return await syncWithExternalAPI();
        } catch (error) {
            console.log(`Sync failed: ${error.message}`);
            throw error; // Will trigger retry logic
        }
    },
    retries: 3,           // Retry up to 3 times
    timeout: 30000        // 30 second timeout
});
```

### Workflow Error Handling

```javascript
const robustWorkflow = scheduler.createWorkflow({
    name: 'Data Processing',
    taskIds: [task1.id, task2.id, task3.id],
    continueOnError: true  // Continue even if some tasks fail
});
```

## Installation & Usage

### Browser Environment

```html
<script src="smart-task-scheduler.js"></script>
<script>
    const scheduler = new SmartTaskScheduler();
    
    // Create and schedule tasks
    const task = scheduler.createTask({
        name: 'Browser Task',
        executor: () => console.log('Running in browser!')
    });
    
    scheduler.executeTask(task.id);
</script>
```

### Node.js Environment

```bash
# Save as smart-task-scheduler.js
node smart-task-scheduler.js

# Or require in your project
const TaskScheduler = require('./smart-task-scheduler.js');
const scheduler = new TaskScheduler();
```

## Monitoring Dashboard

```javascript
// Create a simple monitoring dashboard
function displayDashboard() {
    const analytics = scheduler.getTaskAnalytics();
    
    console.log('📊 TASK SCHEDULER DASHBOARD');
    console.log('===========================');
    console.log(`Total Tasks: ${analytics.totalTasks}`);
    console.log(`Success Rate: ${analytics.successRate}%`);
    console.log(`Avg Execution: ${analytics.averageExecutionTime}ms`);
    console.log('');
    
    console.log('Status Distribution:');
    Object.entries(analytics.statusDistribution).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
    });
    
    console.log('');
    console.log('Upcoming Tasks:');
    analytics.upcomingTasks.slice(0, 5).forEach(task => {
        console.log(`  ${task.taskName} - ${task.scheduledFor}`);
    });
}

// Run dashboard every 30 seconds
setInterval(displayDashboard, 30000);
```

## Best Practices

1. **Task Design**: Keep tasks focused on single responsibilities
2. **Error Handling**: Always include proper error handling in executors
3. **Dependencies**: Avoid circular dependencies between tasks
4. **Timeouts**: Set appropriate timeouts for all tasks
5. **Monitoring**: Regular monitor task analytics and success rates
6. **Resource Management**: Consider system resources when scheduling intensive tasks

## Contributing

Perfect for extending with:
- Database persistence layer
- Web-based management interface
- Advanced cron expression parsing
- Distributed task execution
- Real-time monitoring dashboard
- Integration with external APIs
- Machine learning-based optimization

## License

Open source - use freely for personal and commercial projects!
