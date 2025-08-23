document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element Selectors ---
    const clientInfoArea = document.getElementById('client-info-area');
    const detailsTableHead = document.querySelector('#details-table thead');
    const detailsTableBody = document.querySelector('#details-table tbody');
    const notesTableHead = document.querySelector('#notes-table thead');
    const notesTableBody = document.querySelector('#notes-table tbody');
    const yearFilter = document.getElementById('year-filter');
    const editTasksButton = document.getElementById('edit-tasks-button');
    const saveChangesButton = document.getElementById('save-changes-button');
    const finalizeYearButton = document.getElementById('finalize-year-button');
    const saveStatus = document.getElementById('save-status');
    const pageOverlay = document.createElement('div');
    pageOverlay.className = 'page-overlay';

    // --- State Variables ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no');
    let clientDetails = null;
    let currentYearSelection = new Date().getFullYear().toString(); // Will be updated after data load
    let monthsToDisplay = [];
    let allTaskNames = [];
    let isSaving = false;
    let hasConflict = false;
    let hasUnsavedChanges = false;
    let saveStatusTimeout;

    // --- State Management ---
    function setUnsavedChanges(isDirty) {
        hasUnsavedChanges = isDirty;
        saveChangesButton.disabled = !isDirty;
    }

    // --- Task Inheritance Logic ---
    function inheritFromPreviousYear(targetYear) {
        if (!clientDetails.custom_tasks_by_year) return [];
        
        const targetYearNum = parseInt(targetYear);
        let tasksToInherit = [];
        
        // Look for the most recent previous year with tasks
        for (let year = targetYearNum - 1; year >= targetYearNum - 10; year--) {
            const yearStr = year.toString();
            if (clientDetails.custom_tasks_by_year[yearStr] && 
                clientDetails.custom_tasks_by_year[yearStr].length > 0) {
                tasksToInherit = clientDetails.custom_tasks_by_year[yearStr];
                console.log(`Inheriting tasks from ${yearStr} to ${targetYear}:`, tasksToInherit);
                break;
            }
        }
        
        return tasksToInherit;
    }

    function propagateTasksToFutureYears(fromYear, newTasks) {
        if (!clientDetails.custom_tasks_by_year || !clientDetails.finalized_years) return;
        
        const fromYearNum = parseInt(fromYear);
        const currentYear = new Date().getFullYear();
        const endYear = Math.max(currentYear + 10, fromYearNum + 10); // Look ahead 10 years or more
        
        let propagatedCount = 0;
        
        // Propagate to future years that are not finalized
        for (let year = fromYearNum + 1; year <= endYear; year++) {
            const yearStr = year.toString();
            
            // Skip if year is finalized
            if (clientDetails.finalized_years.includes(yearStr)) {
                continue;
            }
            
            // Only update years that already have tasks (were previously set)
            if (clientDetails.custom_tasks_by_year[yearStr]) {
                clientDetails.custom_tasks_by_year[yearStr] = [...newTasks];
                propagatedCount++;
            }
        }
        
        if (propagatedCount > 0) {
            console.log(`Propagated tasks from ${fromYear} to ${propagatedCount} future years`);
            showNotification(`項目変更を${propagatedCount}つの未来年度にも適用しました`, 'info');
        }
    }

    // --- Notification System ---
    function showNotification(message, type = 'info') {
        // Create or reuse notification element
        let notification = document.getElementById('task-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'task-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 4px;
                color: white;
                font-weight: bold;
                z-index: 1000;
                max-width: 300px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set color based on type
        const colors = {
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#f44336'
        };
        notification.style.backgroundColor = colors[type] || colors.info;
        notification.textContent = message;

        // Show notification
        notification.style.transform = 'translateX(0)';

        // Hide after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
        }, 3000);
    }

    // --- Year Selection Logic ---
    function determineOptimalYear() {
        if (!clientDetails || !clientDetails.finalized_years) {
            return new Date().getFullYear().toString();
        }
        
        // Find the latest finalized year
        const finalizedYears = clientDetails.finalized_years.map(year => parseInt(year)).sort((a, b) => b - a);
        
        if (finalizedYears.length === 0) {
            // No finalized years, use current year
            return new Date().getFullYear().toString();
        }
        
        // Return the year after the latest finalized year
        const latestFinalizedYear = finalizedYears[0];
        const nextYear = latestFinalizedYear + 1;
        
        console.log(`Latest finalized year: ${latestFinalizedYear}, selecting: ${nextYear}`);
        return nextYear.toString();
    }

    function updateCustomDropdownDisplay(selectElement) {
        const wrapper = selectElement.closest('.custom-select-wrapper');
        if (!wrapper) return;
        
        const trigger = wrapper.querySelector('.custom-select-trigger');
        if (!trigger) return;
        
        const selectedOption = Array.from(selectElement.options).find(option => option.value === selectElement.value);
        if (selectedOption) {
            trigger.textContent = selectedOption.textContent;
            console.log(`Updated custom dropdown display to: ${selectedOption.textContent}`);
        }
    }

    // --- Initialization ---
    async function initializeApp() {
        if (!clientNo) {
            clientInfoArea.innerHTML = '<p>エラー: クライアントNo.が指定されていません。</p>';
            return;
        }
        document.body.appendChild(pageOverlay);
        setupYearFilter();

        try {
            clientDetails = await fetchClientDetails(clientNo);
            if (clientDetails) {
                // Determine optimal year after data is loaded
                currentYearSelection = determineOptimalYear();
                
                addEventListeners();
                
                // Update year filter after setup and ensure it's set correctly
                setTimeout(() => {
                    yearFilter.value = currentYearSelection;
                    updateCustomDropdownDisplay(yearFilter);
                    console.log(`Year filter updated to: ${currentYearSelection}`);
                }, 0);
                
                renderDetails();
            } else {
                clientInfoArea.innerHTML = '<p>クライアントデータが見つかりません。</p>';
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            clientInfoArea.innerHTML = '<p>データの読み込み中にエラーが発生しました。</p>';
        }
    }

    // --- Data I/O & Save Logic ---
    async function fetchClientDetails(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/clients/${id}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch client details:", error);
            throw error;
        }
    }

    async function performSave() {
        if (hasConflict || isSaving) return;
        isSaving = true;
        showSaveStatus('saving');

        try {
            const response = await fetch(`${API_BASE_URL}/clients/${clientNo}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientDetails),
            });

            if (response.status === 409) {
                hasConflict = true;
                pageOverlay.textContent = 'データが他のユーザーによって更新されました。ページをリロードしてください。';
                pageOverlay.style.display = 'flex';
                alert('データが他のユーザーによって更新されました。意図しない上書きを防ぐため、ページをリロードします。');
                window.location.reload();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `API Error: ${response.statusText}`);
            }

            const updatedClientDetails = await response.json();
            clientDetails = updatedClientDetails;
            setUnsavedChanges(false); // Reset dirty flag and disable button
            showSaveStatus('success');

        } catch (error) {
            console.error('Failed to save client details:', error);
            showSaveStatus('error');
        } finally {
            isSaving = false;
        }
    }

    function showSaveStatus(status) {
        clearTimeout(saveStatusTimeout);
        saveStatus.classList.remove('success', 'error');

        switch (status) {
            case 'saving':
                saveStatus.textContent = '保存中...';
                break;
            case 'success':
                saveStatus.textContent = 'すべての変更が保存されました';
                saveStatus.classList.add('success');
                break;
            case 'error':
                saveStatus.textContent = '保存に失敗しました';
                saveStatus.classList.add('error');
                break;
        }

        saveStatus.classList.add('visible');

        if (status === 'success' || status === 'error') {
            saveStatusTimeout = setTimeout(() => {
                saveStatus.classList.remove('visible');
            }, 3000);
        }
    }

    // --- UI Setup & Rendering ---
    function setupYearFilter() {
        const currentYear = new Date().getFullYear();
        for (let year = 2025; year <= 2050; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = `${year}年`;
            if (year === currentYear) option.selected = true;
            yearFilter.appendChild(option);
        }
        currentYearSelection = yearFilter.value;
        initializeCustomDropdown(yearFilter);
    }

    function addEventListeners() {
        yearFilter.addEventListener('change', (event) => {
            currentYearSelection = event.target.value;
            renderDetails();
        });
        editTasksButton.addEventListener('click', openTaskEditModal);
        saveChangesButton.addEventListener('click', performSave);
        finalizeYearButton.addEventListener('click', () => {
            const isCurrentlyFinalized = clientDetails.finalized_years && clientDetails.finalized_years.includes(currentYearSelection);
            const action = isCurrentlyFinalized ? '解除' : '確定';
            
            if (confirm(`${currentYearSelection}年度の項目を${action}しますか？`)) {
                // Initialize finalized_years if it doesn't exist
                if (!clientDetails.finalized_years) {
                    clientDetails.finalized_years = [];
                }
                
                if (isCurrentlyFinalized) {
                    // Remove from finalized years
                    clientDetails.finalized_years = clientDetails.finalized_years.filter(year => year !== currentYearSelection);
                } else {
                    // Add to finalized years
                    if (!clientDetails.finalized_years.includes(currentYearSelection)) {
                        clientDetails.finalized_years.push(currentYearSelection);
                    }
                }
                
                setUnsavedChanges(true);
                renderDetails(); // Re-render to update UI state
            }
        });

        window.addEventListener('beforeunload', (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    // --- Modal Logic ---
    const taskEditModal = document.getElementById('task-edit-modal');
    const closeButton = taskEditModal.querySelector('.close-button');
    const taskListContainer = document.getElementById('task-list-container');
    const newTaskInput = document.getElementById('new-task-input');
    const addTaskButton = document.getElementById('add-task-button');
    const saveTasksButton = document.getElementById('save-tasks-button');
    const cancelTasksButton = document.getElementById('cancel-tasks-button');
    let currentEditingTasks = [];

    function openTaskEditModal() {
        // Get custom tasks for current year
        currentEditingTasks = [...((clientDetails.custom_tasks_by_year && clientDetails.custom_tasks_by_year[currentYearSelection]) || [])];
        renderTaskList(currentEditingTasks);
        taskEditModal.style.display = 'block';
    }

    function renderTaskList(tasks) {
        taskListContainer.innerHTML = '';
        tasks.forEach((task, index) => {
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            taskItem.innerHTML = `
                <input type="text" value="${task}" data-index="${index}">
                <button class="delete-task-button" data-index="${index}">削除</button>
            `;
            taskListContainer.appendChild(taskItem);
        });
    }

    addTaskButton.addEventListener('click', () => {
        const newTaskName = newTaskInput.value.trim();
        if (newTaskName && !currentEditingTasks.includes(newTaskName)) {
            currentEditingTasks.push(newTaskName);
            renderTaskList(currentEditingTasks);
        }
    });

    taskListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-task-button')) {
            const index = parseInt(event.target.dataset.index, 10);
            currentEditingTasks.splice(index, 1);
            renderTaskList(currentEditingTasks);
        }
    });

    taskListContainer.addEventListener('input', (event) => {
        if (event.target.tagName === 'INPUT') {
            const index = parseInt(event.target.dataset.index, 10);
            currentEditingTasks[index] = event.target.value.trim();
        }
    });

    saveTasksButton.addEventListener('click', async () => {
        // Initialize custom_tasks_by_year if it doesn't exist
        if (!clientDetails.custom_tasks_by_year) {
            clientDetails.custom_tasks_by_year = {};
        }
        
        const oldTasks = clientDetails.custom_tasks_by_year[currentYearSelection] || [];
        const newTasks = currentEditingTasks.filter(task => task !== '');
        const deletedTasks = oldTasks.filter(task => !newTasks.includes(task));
        
        // Save tasks for current year
        clientDetails.custom_tasks_by_year[currentYearSelection] = [...newTasks];
        
        // Propagate changes to future unfinalized years
        propagateTasksToFutureYears(currentYearSelection, newTasks);
        
        try {
            // Immediately sync tasks to database
            await syncCustomTasksToDatabase(currentYearSelection, newTasks);
            
            // Clean up deleted tasks from monthly data
            if (deletedTasks.length > 0) {
                await cleanupDeletedTasks(currentYearSelection, deletedTasks);
                showSyncStatus(`カスタムタスクを同期し、${deletedTasks.length}項目をDBから削除しました`, 'success');
            } else {
                showSyncStatus('カスタムタスクをDBに同期しました', 'success');
            }
        } catch (error) {
            console.error('Failed to sync custom tasks:', error);
            showSyncStatus('DBへの同期に失敗しました', 'error');
        }
        
        setUnsavedChanges(true);
        taskEditModal.style.display = 'none';
        renderDetails();
    });

    closeButton.addEventListener('click', () => { taskEditModal.style.display = 'none'; });
    cancelTasksButton.addEventListener('click', () => { taskEditModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === taskEditModal) { taskEditModal.style.display = 'none'; } });

    // --- Main Rendering Logic ---
    function renderDetails() {
        [clientInfoArea, detailsTableHead, detailsTableBody, notesTableHead, notesTableBody].forEach(el => {
            if(el) el.innerHTML = '';
        });

        if (!clientDetails) return;

        // Ensure year filter displays current selection
        if (yearFilter.value !== currentYearSelection) {
            yearFilter.value = currentYearSelection;
            updateCustomDropdownDisplay(yearFilter);
        }
        
        // Check if current year is finalized
        const isYearFinalized = clientDetails.finalized_years && clientDetails.finalized_years.includes(currentYearSelection);

        clientInfoArea.innerHTML = `
            <table class="client-info-table">
                <tbody>
                    <tr><th>No.</th><th>事業所名</th><th>決算月</th></tr>
                    <tr><td>${clientDetails.id}</td><td>${clientDetails.name}</td><td>${clientDetails.fiscal_month}月</td></tr>
                </tbody>
            </table>`;

        const fiscalMonthNum = clientDetails.fiscal_month;
        monthsToDisplay = Array.from({ length: 12 }, (_, i) => {
            let month = fiscalMonthNum - i;
            let year = parseInt(currentYearSelection, 10);
            if (month <= 0) { month += 12; year--; }
            return `${year}年${month}月`;
        }).reverse();

        // Get custom tasks for current year, with automatic inheritance
        if (!clientDetails.custom_tasks_by_year) {
            clientDetails.custom_tasks_by_year = {};
        }
        
        // Auto-inherit from previous year if current year has no tasks
        if (!clientDetails.custom_tasks_by_year[currentYearSelection]) {
            const previousYearTasks = inheritFromPreviousYear(currentYearSelection);
            if (previousYearTasks.length > 0) {
                clientDetails.custom_tasks_by_year[currentYearSelection] = [...previousYearTasks];
                setUnsavedChanges(true); // Mark as needing save
                
                // Show user notification about inheritance
                showNotification(`${currentYearSelection}年度の項目を前年度から自動継承しました`, 'info');
            }
        }
        
        allTaskNames = clientDetails.custom_tasks_by_year[currentYearSelection] || [];

        // Update finalize button text and state
        finalizeYearButton.textContent = isYearFinalized ? 
            `${currentYearSelection}年度の確定を解除` : 
            `${currentYearSelection}年度の項目を確定`;
        
        // Disable edit tasks button for finalized years
        editTasksButton.disabled = isYearFinalized;
        
        renderTaskAndMemoTable(isYearFinalized);
        renderUrlAndMemoTable(isYearFinalized);
    }

    function renderTaskAndMemoTable(isYearFinalized) {
        const taskHeaderRow = detailsTableHead.insertRow();
        const firstHeader = document.createElement('th');
        firstHeader.textContent = '項目';
        taskHeaderRow.appendChild(firstHeader);
        monthsToDisplay.forEach(monthStr => {
            const th = document.createElement('th');
            th.textContent = monthStr;
            th.classList.add('month-header');
            th.addEventListener('click', () => {
                if (hasConflict) return;
                const columnIndex = Array.from(th.parentNode.children).indexOf(th);

                let allChecked = true;
                allTaskNames.forEach((taskName) => {
                    const monthData = findOrCreateMonthlyTask(clientDetails, monthStr);
                    const taskData = findOrCreateTask(monthData, taskName);
                    if (!taskData.checked) {
                        allChecked = false;
                    }
                });

                allTaskNames.forEach((taskName, rowIndex) => {
                    const monthData = findOrCreateMonthlyTask(clientDetails, monthStr);
                    const taskData = findOrCreateTask(monthData, taskName);
                    taskData.checked = !allChecked;
                    const checkbox = detailsTableBody.rows[rowIndex].cells[columnIndex].querySelector('.task-checkbox');
                    if (checkbox) {
                        checkbox.checked = taskData.checked;
                        checkbox.parentNode.classList.toggle('task-completed', checkbox.checked);
                    }
                });

                updateMonthlyStatus(findOrCreateMonthlyTask(clientDetails, monthStr), allTaskNames);
                setUnsavedChanges(true);
            });
            taskHeaderRow.appendChild(th);
        });

        allTaskNames.forEach(taskName => {
            const taskRow = detailsTableBody.insertRow();
            taskRow.insertCell().textContent = taskName;
            monthsToDisplay.forEach(monthStr => {
                const cell = taskRow.insertCell();
                cell.className = 'task-input-cell';

                const monthData = findOrCreateMonthlyTask(clientDetails, monthStr);
                const taskData = findOrCreateTask(monthData, taskName);

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                checkbox.checked = taskData.checked;
                checkbox.disabled = isYearFinalized;
                cell.appendChild(checkbox);

                const memoTextarea = document.createElement('textarea');
                memoTextarea.className = 'task-memo';
                memoTextarea.value = taskData.note || '';
                //memoTextarea.placeholder = 'タスクメモ...';
                memoTextarea.rows = 1;
                memoTextarea.disabled = isYearFinalized;
                cell.appendChild(memoTextarea);

                if (checkbox.checked) cell.classList.add('task-completed');

                checkbox.addEventListener('change', () => {
                    if (hasConflict) return;
                    taskData.checked = checkbox.checked;
                    updateMonthlyStatus(monthData, allTaskNames);
                    cell.classList.toggle('task-completed', checkbox.checked);
                    setUnsavedChanges(true);
                });

                memoTextarea.addEventListener('input', (e) => {
                    if (hasConflict) return;
                    taskData.note = e.target.value;
                    setUnsavedChanges(true);
                });
            });
        });

        const statusRow = detailsTableBody.insertRow();
        statusRow.insertCell().textContent = '月次ステータス';
        monthsToDisplay.forEach(monthStr => {
            const statusCell = statusRow.insertCell();
            statusCell.className = 'monthly-status';
            const targetMonthData = clientDetails.monthly_tasks.find(mt => mt.month === monthStr);
            updateStatusCell(statusCell, targetMonthData, allTaskNames);
        });
    }

    function renderUrlAndMemoTable(isYearFinalized) {
        const notesHeaderRow = notesTableHead.insertRow();
        const firstHeader = document.createElement('th');
        firstHeader.textContent = '項目';
        notesHeaderRow.appendChild(firstHeader);
        monthsToDisplay.forEach(monthStr => {
            const th = document.createElement('th');
            th.textContent = monthStr;
            th.classList.add('month-header');
            notesHeaderRow.appendChild(th);
        });

        const urlRow = notesTableBody.insertRow();
        urlRow.insertCell().textContent = 'URL';
        monthsToDisplay.forEach(monthStr => {
            const monthData = findOrCreateMonthlyTask(clientDetails, monthStr);
            const urlCell = urlRow.insertCell();
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = monthData.url || '';
            //urlInput.placeholder = 'URLを入力';
            urlInput.disabled = isYearFinalized;
            urlInput.addEventListener('input', (e) => {
                if (hasConflict) return;
                monthData.url = e.target.value;
                setUnsavedChanges(true);
            });
            urlCell.appendChild(urlInput);
        });

        const memoRow = notesTableBody.insertRow();
        memoRow.classList.add('memo-row');
        memoRow.insertCell().textContent = 'メモ';
        monthsToDisplay.forEach(monthStr => {
            const monthData = findOrCreateMonthlyTask(clientDetails, monthStr);
            const memoCell = memoRow.insertCell();
            const memoTextarea = document.createElement('textarea');
            memoTextarea.value = monthData.memo || '';
           // memoTextarea.placeholder = '月次のメモを入力';
            memoTextarea.rows = 4;
            memoTextarea.disabled = isYearFinalized;
            memoTextarea.addEventListener('input', (e) => {
                if (hasConflict) return;
                monthData.memo = e.target.value;
                setUnsavedChanges(true);
            });
            memoCell.appendChild(memoTextarea);
        });
    }

    function updateStatusCell(cell, monthData, taskNames) {
        if (!monthData || !monthData.tasks || taskNames.length === 0) {
            cell.textContent = '-';
            cell.style.backgroundColor = '#f0f0f0';
            return;
        }
        const totalTasks = taskNames.length;
        const completedTasks = taskNames.filter(task => monthData.tasks[task]?.checked).length;

        if (totalTasks > 0 && totalTasks === completedTasks) {
            cell.textContent = '月次完了';
            cell.style.backgroundColor = '#ccffcc';
        } else if (completedTasks === 0) {
            cell.textContent = '未入力';
            cell.style.backgroundColor = '#e0e0e0';
        } else {
            const percentage = Math.round((completedTasks / totalTasks) * 100);
            cell.textContent = `${percentage}%`;
            cell.style.backgroundColor = '#ffff99';
        }
    }

     function updateMonthlyStatus(monthData, taskNames) {
        const monthIndex = monthsToDisplay.findIndex(m => m === monthData.month);
        if (monthIndex === -1) return;

        const statusRow = detailsTableBody.querySelector('tr:last-child');
        if(!statusRow) return;
        const statusCell = statusRow.cells[monthIndex + 1];
        updateStatusCell(statusCell, monthData, allTaskNames);
    }

    // --- Helper Functions ---
    function findOrCreateMonthlyTask(clientDetails, monthStr) {
        let monthData = clientDetails.monthly_tasks.find(mt => mt.month === monthStr);
        if (!monthData) {
            monthData = { month: monthStr, tasks: {}, url: '', memo: '' };
            clientDetails.monthly_tasks.push(monthData);
        }
        return monthData;
    }

    function findOrCreateTask(monthData, taskName) {
        if (!monthData.tasks[taskName]) {
            monthData.tasks[taskName] = { checked: false, note: '' };
        }
        return monthData.tasks[taskName];
    }

    // --- Custom Tasks Sync Functions ---
    async function syncCustomTasksToDatabase(year, customTasks) {
        const response = await fetch(`${API_BASE_URL}/clients/${clientNo}/custom-tasks/${year}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                custom_tasks: customTasks
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to sync custom tasks');
        }

        return response.json();
    }

    async function checkCustomTasksSync() {
        const response = await fetch(`${API_BASE_URL}/clients/${clientNo}/custom-tasks/sync-check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                custom_tasks_by_year: clientDetails.custom_tasks_by_year || {}
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to check sync');
        }

        return response.json();
    }

    function showSyncStatus(message, type) {
        const statusDiv = document.createElement('div');
        statusDiv.className = `sync-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            font-weight: bold;
            ${type === 'success' ? 'background: #4CAF50; color: white;' : 'background: #f44336; color: white;'}
        `;
        
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            document.body.removeChild(statusDiv);
        }, 3000);
    }

    async function cleanupDeletedTasks(year, deletedTasks) {
        const response = await fetch(`${API_BASE_URL}/clients/${clientNo}/cleanup-deleted-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                year: year,
                deleted_tasks: deletedTasks
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to cleanup deleted tasks');
        }

        return response.json();
    }

    async function propagateTasksToDatabase(sourceYear, targetYears = []) {
        const response = await fetch(`${API_BASE_URL}/clients/${clientNo}/propagate-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_year: sourceYear,
                target_years: targetYears
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to propagate tasks');
        }

        return response.json();
    }

    // Add management buttons to the UI
    function addManagementButtons() {
        // Create container for management buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'management-buttons';
        buttonContainer.style.cssText = `
            margin: 10px 0;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        `;

        // Data sync check button
        const syncButton = document.createElement('button');
        syncButton.textContent = 'データ整合性チェック';
        syncButton.className = 'sync-check-button';
        syncButton.style.cssText = `
            padding: 8px 16px;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        syncButton.addEventListener('click', async () => {
            try {
                const result = await checkCustomTasksSync();
                
                if (result.is_synced) {
                    showSyncStatus('データは同期されています', 'success');
                } else {
                    console.log('Sync mismatches found:', result.mismatches);
                    showSyncStatus(`${result.mismatches.length}件の不整合を検出しました`, 'error');
                    
                    // Show detailed mismatch information
                    let details = 'データベースとの不整合:\n';
                    result.mismatches.forEach(mismatch => {
                        details += `\n年度 ${mismatch.year}:`;
                        if (mismatch.missing_in_db.length > 0) {
                            details += `\n  DBに未反映: ${mismatch.missing_in_db.join(', ')}`;
                        }
                        if (mismatch.missing_in_frontend.length > 0) {
                            details += `\n  フロントエンドに未反映: ${mismatch.missing_in_frontend.join(', ')}`;
                        }
                    });
                    
                    if (confirm(details + '\n\nデータベースの内容でフロントエンドを更新しますか？')) {
                        clientDetails.custom_tasks_by_year = result.db_tasks_by_year;
                        renderDetails();
                        showSyncStatus('フロントエンドを更新しました', 'success');
                    }
                }
            } catch (error) {
                console.error('Sync check failed:', error);
                showSyncStatus('整合性チェックに失敗しました', 'error');
            }
        });

        // Propagate to future years button
        const propagateButton = document.createElement('button');
        propagateButton.textContent = '項目を翌期以降に再反映';
        propagateButton.className = 'propagate-button';
        propagateButton.style.cssText = `
            padding: 8px 16px;
            background: #FF9800;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        `;
        
        propagateButton.addEventListener('click', async () => {
            if (confirm(`${currentYearSelection}年の項目構成を翌期以降の未確定年度にすべて再反映しますか？\n（既に確定済みの年度は変更されません）`)) {
                try {
                    const result = await propagateTasksToDatabase(currentYearSelection);
                    showSyncStatus(`${result.propagated_to.length}年度に項目を再反映しました`, 'success');
                    
                    // Update frontend data
                    result.propagated_to.forEach(year => {
                        if (!clientDetails.custom_tasks_by_year) {
                            clientDetails.custom_tasks_by_year = {};
                        }
                        clientDetails.custom_tasks_by_year[year] = [...result.tasks];
                    });
                    
                    renderDetails();
                } catch (error) {
                    console.error('Failed to propagate tasks:', error);
                    showSyncStatus('項目の再反映に失敗しました', 'error');
                }
            }
        });

        buttonContainer.appendChild(syncButton);
        buttonContainer.appendChild(propagateButton);
        
        // Add container after edit tasks button
        editTasksButton.parentNode.insertBefore(buttonContainer, editTasksButton.nextSibling);
    }

    // --- Run Application ---
    initializeApp().then(() => {
        addManagementButtons();
    });
});
