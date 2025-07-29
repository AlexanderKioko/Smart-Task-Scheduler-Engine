class SmartTaskScheduler {
    constructor() {
        this.tasks = new Map();
        this.workflows = new Map();
        this.schedules = new Map();
        this.executionHistory = [];
        this.activeTimers = new Map();
        this.taskIdCounter = 1;
        this.workflowIdCounter = 1;

        this.priorities = {
            CRITICAL: 5,
            HIGH: 4,
            MEDIUM: 3,
            LOW: 2,
            BACKGROUND: 1
        };

        this.taskStatuses = {
            PENDING: 'pending',
            RUNNING: 'running',
            COMPLETED: 'completed',
            FAILED: 'failed',
            CANCELLED: 'cancelled',
            WAITING: 'waiting'
        };

        this.scheduleModes = {
            ONCE: 'once',
            RECURRING: 'recurring',
            CRON: 'cron',
            DEPENDENCY: 'dependency'
        };

        // Start the main scheduler loop
        this.startScheduler();
    }

    createTask(config) {
        const task = {
            id: this.taskIdCounter++,
            name: config.name || `Task ${this.taskIdCounter - 1}`,
            description: config.description || '',
            priority: config.priority || 'MEDIUM',
            status: this.taskStatuses.PENDING,

            // Execution details
            executor: config.executor || (() => console.log(`Executing ${config.name}`)),
            timeout: config.timeout || 30000, // 30 seconds default
            retries: config.retries || 0,
            currentRetries: 0,

            // Dependencies
            dependencies: config.dependencies || [],
            dependents: [],

            // Scheduling
            schedule: config.schedule || null,
            estimatedDuration: config.estimatedDuration || 1000,

            // Metadata
            tags: config.tags || [],
            category: config.category || 'general',
            createdAt: new Date(),
            updatedAt: new Date(),

            // Execution tracking
            startTime: null,
            endTime: null,
            executionTime: null,
            result: null,
            error: null
        };

        this.tasks.set(task.id, task);
        this.updateDependents(task);

        console.log(`Created task: ${task.name} (ID: ${task.id})`);
        return task;
    }

    updateDependents(task) {
        // Update dependent tasks list for dependencies
        task.dependencies.forEach(depId => {
            const depTask = this.tasks.get(depId);
            if (depTask && !depTask.dependents.includes(task.id)) {
                depTask.dependents.push(task.id);
            }
        });
    }

    createWorkflow(config) {
        const workflow = {
            id: this.workflowIdCounter++,
            name: config.name || `Workflow ${this.workflowIdCounter - 1}`,
            description: config.description || '',
            taskIds: config.taskIds || [],
            parallelExecution: config.parallelExecution || false,
            continueOnError: config.continueOnError || false,
            status: this.taskStatuses.PENDING,
            createdAt: new Date(),
            executionOrder: []
        };

        this.workflows.set(workflow.id, workflow);

        console.log(`Created workflow: ${workflow.name} (ID: ${workflow.id})`);
        return workflow;
    }

    scheduleTask(taskId, scheduleConfig) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        const schedule = {
            taskId,
            mode: scheduleConfig.mode || this.scheduleModes.ONCE,
            executeAt: scheduleConfig.executeAt || new Date(),
            interval: scheduleConfig.interval || null,
            cronExpression: scheduleConfig.cronExpression || null,
            maxExecutions: scheduleConfig.maxExecutions || null,
            executionCount: 0,
            isActive: true,
            lastExecution: null,
            nextExecution: null
        };

        schedule.nextExecution = this.calculateNextExecution(schedule);
        this.schedules.set(`${taskId}_${Date.now()}`, schedule);

        console.log(`⏰ Scheduled task ${task.name} for ${schedule.nextExecution}`);
        return schedule;
    }

    calculateNextExecution(schedule) {
        const now = new Date();

        switch (schedule.mode) {
            case this.scheduleModes.ONCE:
                return schedule.executeAt > now ? schedule.executeAt : now;

            case this.scheduleModes.RECURRING:
                if (!schedule.lastExecution) {
                    return schedule.executeAt > now ? schedule.executeAt : now;
                }
                return new Date(schedule.lastExecution.getTime() + schedule.interval);

            case this.scheduleModes.CRON:
                return this.parseCronExpression(schedule.cronExpression, now);

            case this.scheduleModes.DEPENDENCY:
                return null; // Handled by dependency resolution

            default:
                return now;
        }
    }

    parseCronExpression(cronExpr, fromDate) {
        // Simplified cron parser for common patterns
        // Format: "minute hour day month dayOfWeek"
        const parts = cronExpr.split(' ');
        if (parts.length !== 5) {
            console.warn('Invalid cron expression, using immediate execution');
            return fromDate;
        }

        const [minute, hour, day, month, dayOfWeek] = parts;
        const nextRun = new Date(fromDate);

        // Simple implementation for demonstration
        if (minute !== '*') nextRun.setMinutes(parseInt(minute));
        if (hour !== '*') nextRun.setHours(parseInt(hour));

        // If time has passed today, schedule for tomorrow
        if (nextRun <= fromDate) {
            nextRun.setDate(nextRun.getDate() + 1);
        }

        return nextRun;
    }

    async executeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Check dependencies
        if (!this.areDependenciesMet(task)) {
            task.status = this.taskStatuses.WAITING;
            console.log(`Task ${task.name} waiting for dependencies`);
            return false;
        }

        task.status = this.taskStatuses.RUNNING;
        task.startTime = new Date();
        task.updatedAt = new Date();

        console.log(`Executing task: ${task.name}`);

        try {
            // Set timeout for task execution
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Task timeout')), task.timeout);
            });

            // Execute the task
            const executionPromise = Promise.resolve(task.executor(task));

            task.result = await Promise.race([executionPromise, timeoutPromise]);

            task.status = this.taskStatuses.COMPLETED;
            task.endTime = new Date();
            task.executionTime = task.endTime - task.startTime;

            console.log(`Task ${task.name} completed in ${task.executionTime}ms`);

            // Trigger dependent tasks
            this.triggerDependentTasks(task);

            // Record execution
            this.recordExecution(task, true);

            return true;

        } catch (error) {
            task.error = error.message;
            task.endTime = new Date();
            task.executionTime = task.endTime - task.startTime;

            // Handle retries
            if (task.currentRetries < task.retries) {
                task.currentRetries++;
                task.status = this.taskStatuses.PENDING;
                console.log(`Retrying task ${task.name} (${task.currentRetries}/${task.retries})`);

                // Schedule retry after delay
                setTimeout(() => this.executeTask(taskId), 5000);
                return false;
            }

            task.status = this.taskStatuses.FAILED;
            console.log(`Task ${task.name} failed: ${error.message}`);

            this.recordExecution(task, false);
            return false;
        }
    }

    areDependenciesMet(task) {
        return task.dependencies.every(depId => {
            const depTask = this.tasks.get(depId);
            return depTask && depTask.status === this.taskStatuses.COMPLETED;
        });
    }

    triggerDependentTasks(completedTask) {
        completedTask.dependents.forEach(dependentId => {
            const dependentTask = this.tasks.get(dependentId);
            if (dependentTask &&
                dependentTask.status === this.taskStatuses.WAITING &&
                this.areDependenciesMet(dependentTask)) {

                dependentTask.status = this.taskStatuses.PENDING;
                console.log(`Unlocked dependent task: ${dependentTask.name}`);
            }
        });
    }

    async executeWorkflow(workflowId) {
        const workflow = this.workflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        workflow.status = this.taskStatuses.RUNNING;
        console.log(`Starting workflow: ${workflow.name}`);

        try {
            if (workflow.parallelExecution) {
                await this.executeWorkflowParallel(workflow);
            } else {
                await this.executeWorkflowSequential(workflow);
            }

            workflow.status = this.taskStatuses.COMPLETED;
            console.log(`Workflow ${workflow.name} completed`);

        } catch (error) {
            workflow.status = this.taskStatuses.FAILED;
            console.log(`Workflow ${workflow.name} failed: ${error.message}`);

            if (!workflow.continueOnError) {
                throw error;
            }
        }
    }

    async executeWorkflowSequential(workflow) {
        for (const taskId of workflow.taskIds) {
            const success = await this.executeTask(taskId);
            workflow.executionOrder.push(taskId);

            if (!success && !workflow.continueOnError) {
                throw new Error(`Task ${taskId} failed in workflow`);
            }
        }
    }

    async executeWorkflowParallel(workflow) {
        const promises = workflow.taskIds.map(taskId => {
            workflow.executionOrder.push(taskId);
            return this.executeTask(taskId);
        });

        const results = await Promise.allSettled(promises);

        if (!workflow.continueOnError) {
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0) {
                throw new Error(`${failures.length} tasks failed in parallel workflow`);
            }
        }
    }

    recordExecution(task, success) {
        const record = {
            taskId: task.id,
            taskName: task.name,
            success,
            startTime: task.startTime,
            endTime: task.endTime,
            executionTime: task.executionTime,
            error: task.error,
            result: task.result,
            timestamp: new Date()
        };

        this.executionHistory.push(record);

        // Keep only last 1000 records to prevent memory issues
        if (this.executionHistory.length > 1000) {
            this.executionHistory = this.executionHistory.slice(-1000);
        }
    }

    startScheduler() {
        // Main scheduler loop - runs every 5 seconds
        const schedulerInterval = setInterval(() => {
            this.processSchedules();
        }, 5000);

        this.schedulerTimer = schedulerInterval;
        console.log('Task scheduler started');
    }

    processSchedules() {
        const now = new Date();

        for (const [scheduleId, schedule] of this.schedules.entries()) {
            if (!schedule.isActive || !schedule.nextExecution) continue;

            if (now >= schedule.nextExecution) {
                const task = this.tasks.get(schedule.taskId);

                if (task && task.status === this.taskStatuses.PENDING) {
                    this.executeTask(schedule.taskId);

                    schedule.executionCount++;
                    schedule.lastExecution = now;

                    // Calculate next execution for recurring tasks
                    if (schedule.mode === this.scheduleModes.RECURRING) {
                        if (!schedule.maxExecutions ||
                            schedule.executionCount < schedule.maxExecutions) {
                            schedule.nextExecution = this.calculateNextExecution(schedule);
                        } else {
                            schedule.isActive = false;
                        }
                    } else if (schedule.mode === this.scheduleModes.ONCE) {
                        schedule.isActive = false;
                    }
                }
            }
        }
    }

    getTasksByPriority() {
        const tasksByPriority = {};

        for (const priority in this.priorities) {
            tasksByPriority[priority] = [];
        }

        for (const task of this.tasks.values()) {
            if (tasksByPriority[task.priority]) {
                tasksByPriority[task.priority].push(task);
            }
        }

        return tasksByPriority;
    }

    getTaskAnalytics() {
        const analytics = {
            totalTasks: this.tasks.size,
            statusDistribution: {},
            priorityDistribution: {},
            averageExecutionTime: 0,
            successRate: 0,
            mostFailedTasks: [],
            upcomingTasks: []
        };

        // Calculate status distribution
        for (const status of Object.values(this.taskStatuses)) {
            analytics.statusDistribution[status] = 0;
        }

        for (const priority in this.priorities) {
            analytics.priorityDistribution[priority] = 0;
        }

        let totalExecutionTime = 0;
        let executedTasksCount = 0;

        for (const task of this.tasks.values()) {
            analytics.statusDistribution[task.status]++;
            analytics.priorityDistribution[task.priority]++;

            if (task.executionTime) {
                totalExecutionTime += task.executionTime;
                executedTasksCount++;
            }
        }

        analytics.averageExecutionTime = executedTasksCount > 0
            ? Math.round(totalExecutionTime / executedTasksCount)
            : 0;

        // Calculate success rate from execution history
        if (this.executionHistory.length > 0) {
            const successCount = this.executionHistory.filter(h => h.success).length;
            analytics.successRate = Math.round((successCount / this.executionHistory.length) * 100);
        }

        // Find most failed tasks
        const failureCounts = {};
        this.executionHistory.forEach(record => {
            if (!record.success) {
                failureCounts[record.taskName] = (failureCounts[record.taskName] || 0) + 1;
            }
        });

        analytics.mostFailedTasks = Object.entries(failureCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, failures: count }));

        // Get upcoming scheduled tasks
        const now = new Date();
        analytics.upcomingTasks = Array.from(this.schedules.values())
            .filter(s => s.isActive && s.nextExecution && s.nextExecution > now)
            .sort((a, b) => a.nextExecution - b.nextExecution)
            .slice(0, 10)
            .map(s => ({
                taskName: this.tasks.get(s.taskId)?.name,
                scheduledFor: s.nextExecution,
                mode: s.mode
            }));

        return analytics;
    }

    pauseTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task && task.status === this.taskStatuses.PENDING) {
            task.status = this.taskStatuses.CANCELLED;
            console.log(`Paused task: ${task.name}`);
            return true;
        }
        return false;
    }

    resumeTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task && task.status === this.taskStatuses.CANCELLED) {
            task.status = this.taskStatuses.PENDING;
            console.log(`Resumed task: ${task.name}`);
            return true;
        }
        return false;
    }

    cancelTask(taskId) {
        const task = this.tasks.get(taskId);
        if (task) {
            task.status = this.taskStatuses.CANCELLED;
            console.log(`Cancelled task: ${task.name}`);
            return true;
        }
        return false;
    }

    optimizeSchedule() {
        // Simple optimization: sort pending tasks by priority and estimated duration
        const pendingTasks = Array.from(this.tasks.values())
            .filter(t => t.status === this.taskStatuses.PENDING)
            .sort((a, b) => {
                // Higher priority first, then shorter duration
                if (this.priorities[a.priority] !== this.priorities[b.priority]) {
                    return this.priorities[b.priority] - this.priorities[a.priority];
                }
                return a.estimatedDuration - b.estimatedDuration;
            });

        console.log('Schedule optimized based on priority and duration');
        return pendingTasks;
    }

    createAutomation(name, trigger, actions) {
        const automation = {
            id: `auto_${Date.now()}`,
            name,
            trigger, // Function that returns boolean
            actions, // Array of functions to execute
            isActive: true,
            executionCount: 0,
            lastTriggered: null
        };

        // Check trigger every 10 seconds
        const checkTrigger = () => {
            if (automation.isActive && automation.trigger()) {
                console.log(`Automation triggered: ${automation.name}`);
                automation.actions.forEach(action => action());
                automation.executionCount++;
                automation.lastTriggered = new Date();
            }
        };

        const intervalId = setInterval(checkTrigger, 10000);
        this.activeTimers.set(automation.id, intervalId);

        console.log(`Created automation: ${automation.name}`);
        return automation;
    }

    getTasksByStatus(status) {
        return Array.from(this.tasks.values()).filter(task => task.status === status);
    }

    stopScheduler() {
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            console.log('Task scheduler stopped');
        }

        // Clear all automation timers
        for (const [id, timerId] of this.activeTimers.entries()) {
            clearInterval(timerId);
        }
        this.activeTimers.clear();
    }

    exportTasks() {
        return {
            tasks: Array.from(this.tasks.values()),
            workflows: Array.from(this.workflows.values()),
            schedules: Array.from(this.schedules.values()),
            executionHistory: this.executionHistory.slice(-100), // Last 100 records
            exportedAt: new Date()
        };
    }

    importTasks(data) {
        if (data.tasks) {
            data.tasks.forEach(task => {
                this.tasks.set(task.id, task);
                if (task.id >= this.taskIdCounter) {
                    this.taskIdCounter = task.id + 1;
                }
            });
        }

        if (data.workflows) {
            data.workflows.forEach(workflow => {
                this.workflows.set(workflow.id, workflow);
                if (workflow.id >= this.workflowIdCounter) {
                    this.workflowIdCounter = workflow.id + 1;
                }
            });
        }

        console.log(`Imported ${data.tasks?.length || 0} tasks and ${data.workflows?.length || 0} workflows`);
    }
}

// Create scheduler instance
const scheduler = new SmartTaskScheduler();
// Demo setup with example tasks
console.log('SMART TASK SCHEDULER ENGINE');
console.log('=====================================');
// Create some example tasks
const emailTask = scheduler.createTask({
    name: 'Send Daily Email Report',
    description: 'Generate and send daily analytics email',
    priority: 'HIGH',
    executor: () => {
        console.log('Sending daily email report...');
        return 'Email sent successfully';
    },
    estimatedDuration: 3000,
    category: 'communication',
    tags: ['email', 'reporting', 'daily']
});
const backupTask = scheduler.createTask({
    name: 'Database Backup',
    description: 'Create backup of main database',
    priority: 'CRITICAL',
    executor: () => {
        console.log('Creating database backup...');
        return 'Backup completed';
    },
    timeout: 60000,
    retries: 2,
    category: 'maintenance',
    tags: ['backup', 'database']
});
const analyticsTask = scheduler.createTask({
    name: 'Process Analytics',
    description: 'Process user analytics data',
    priority: 'MEDIUM',
    dependencies: [backupTask.id], // Depends on backup completion
    executor: () => {
        console.log('Processing analytics data...');
        return 'Analytics processed';
    },
    category: 'analysis',
    tags: ['analytics', 'data']
});
// Schedule tasks
scheduler.scheduleTask(emailTask.id, {
    mode: 'RECURRING',
    executeAt: new Date(Date.now() + 10000), // Start in 10 seconds
    interval: 30000 // Every 30 seconds for demo
});
scheduler.scheduleTask(backupTask.id, {
    mode: 'CRON',
    cronExpression: '0 2 * * *' // Daily at 2 AM
});
// Create a workflow
const workflow = scheduler.createWorkflow({
    name: 'Daily Maintenance',
    description: 'Run daily backup and analytics',
    taskIds: [backupTask.id, analyticsTask.id],
    parallelExecution: false,
    continueOnError: true
});
console.log('\n=== QUICK START COMMANDS ===');
console.log('scheduler.getTaskAnalytics() - View task statistics');
console.log('scheduler.optimizeSchedule() - Optimize task execution order');
console.log('scheduler.executeTask(taskId) - Manually execute a task');
console.log('scheduler.executeWorkflow(workflowId) - Run a workflow');
console.log('scheduler.pauseTask(taskId) - Pause a task');
console.log('scheduler.resumeTask(taskId) - Resume a paused task');
console.log('');
console.log('Example task IDs:', Array.from(scheduler.tasks.keys()));
console.log('Example workflow ID:', workflow.id);
// Create an automation example
scheduler.createAutomation(
    'High Priority Alert',
    () => {
        // Trigger when there are too many failed tasks
        const analytics = scheduler.getTaskAnalytics();
        return analytics.successRate < 80;
    },
    [
        () => console.log('ALERT: Task success rate below 80%!'),
        () => console.log('Consider reviewing failed tasks')
    ]
);
// Export for Node.js if needed
if (typeof module !== 'undefined') {
    module.exports = SmartTaskScheduler;
}