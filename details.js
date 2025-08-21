document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element Selectors ---
    const clientInfoArea = document.getElementById('client-info-area');
    const detailsTableHead = document.querySelector('#details-table thead');
    const detailsTableBody = document.querySelector('#details-table tbody');
    const notesTableHead = document.querySelector('#notes-table thead');
    const notesTableBody = document.querySelector('#notes-table tbody');
    const yearFilter = document.getElementById('year-filter');
    const editTasksButton = document.getElementById('edit-tasks-button');
    const finalizeYearButton = document.getElementById('finalize-year-button');
    const pageOverlay = document.createElement('div');
    pageOverlay.className = 'page-overlay';

    // --- State Variables ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no');
    let clientDetails = null;
    let currentYearSelection = new Date().getFullYear().toString();
    let monthsToDisplay = [];
    let allTaskNames = [];
    let isSaving = false;
    let hasConflict = false;

    // --- Utility Functions ---
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

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
                addEventListeners();
                renderDetails();
            } else {
                clientInfoArea.innerHTML = '<p>クライアントデータが見つかりません。</p>';
            }
        } catch (error) {
            console.error("Initialization failed:", error);
            clientInfoArea.innerHTML = '<p>データの読み込み中にエラーが発生しました。</p>';
        }
    }

    // --- Data I/O ---
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

    const saveClientDetails = debounce(async () => {
        if (hasConflict) return;
        isSaving = true;
        // Optional: Add a saving indicator to the UI
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
                throw new Error(`API Error: ${response.statusText}`);
            }

            const updatedClientDetails = await response.json();
            // Update local data with the response from the server, including the new updated_at timestamp
            clientDetails = updatedClientDetails;
            console.log('Save successful!');

        } catch (error) {
            console.error('Failed to save client details:', error);
            alert('データの保存に失敗しました。');
        } finally {
            isSaving = false;
            // Optional: Remove saving indicator
        }
    }, 1500); // Debounce save calls by 1.5 seconds

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

        // Enable Edit Tasks button
        editTasksButton.disabled = false;
        editTasksButton.addEventListener('click', openTaskEditModal);

        // Finalize Year button is still disabled
        // finalizeYearButton.disabled = true;
        finalizeYearButton.addEventListener('click', () => {
            alert('「この年度の項目を確定」機能は現在開発中です。');
            // TODO: Implement year finalization logic
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
        currentEditingTasks = [...(clientDetails.custom_tasks || [])];
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
            newTaskInput.value = '';
        }
    });

    taskListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-task-button')) {
            const index = parseInt(event.target.dataset.index);
            currentEditingTasks.splice(index, 1);
            renderTaskList(currentEditingTasks);
        }
    });

    taskListContainer.addEventListener('input', (event) => {
        if (event.target.tagName === 'INPUT') {
            const index = parseInt(event.target.dataset.index);
            currentEditingTasks[index] = event.target.value.trim();
        }
    });

    saveTasksButton.addEventListener('click', () => {
        clientDetails.custom_tasks = currentEditingTasks.filter(task => task !== '');
        saveClientDetails(); // Save to backend
        taskEditModal.style.display = 'none';
        renderDetails(); // Re-render to update table headers
    });

    closeButton.addEventListener('click', () => { taskEditModal.style.display = 'none'; });
    cancelTasksButton.addEventListener('click', () => { taskEditModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target === taskEditModal) { taskEditModal.style.display = 'none'; } });

    function renderDetails() {
        // Clear previous content
        ['client-info-area', '#details-table thead', '#details-table tbody', '#notes-table thead', '#notes-table tbody'].forEach(selector => {
            const el = document.querySelector(selector) || document.getElementById(selector);
            if(el) el.innerHTML = '';
        });

        if (!clientDetails) return;

        const isYearFinalized = false; // Year finalization logic is disabled for now

        // Render client header
        clientInfoArea.innerHTML = `
            <table class="client-info-table">
                <tbody>
                    <tr><th>No.</th><th>事業所名</th><th>決算月</th></tr>
                    <tr><td>${clientDetails.id}</td><td>${clientDetails.name}</td><td>${clientDetails.fiscal_month}月</td></tr>
                </tbody>
            </table>`;

        // Determine months to display
        const fiscalMonthNum = clientDetails.fiscal_month;
        monthsToDisplay = Array.from({ length: 12 }, (_, i) => {
            let month = fiscalMonthNum - i;
            let year = parseInt(currentYearSelection);
            if (month <= 0) { month += 12; year--; }
            return `${year}年${month}月`;
        }).reverse();

        allTaskNames = clientDetails.custom_tasks || [];

        renderTaskTable(isYearFinalized);
        renderNotesTable(isYearFinalized);
    }

    function renderTaskTable(isYearFinalized) {
        const taskHeaderRow = detailsTableHead.insertRow();
        taskHeaderRow.insertCell().textContent = '項目';
        monthsToDisplay.forEach(monthStr => {
            taskHeaderRow.insertCell().textContent = monthStr;
        });

        allTaskNames.forEach(taskName => {
            const taskRow = detailsTableBody.insertRow();
            taskRow.insertCell().textContent = taskName;
            monthsToDisplay.forEach(monthStr => {
                const cell = taskRow.insertCell();
                cell.className = 'task-input-cell';

                let monthData = clientDetails.monthly_tasks.find(mt => mt.month === monthStr);
                if (!monthData) {
                    monthData = { month: monthStr, tasks: {}, url: '', memo: '' };
                    clientDetails.monthly_tasks.push(monthData);
                }
                 if (!monthData.tasks[taskName]) {
                    monthData.tasks[taskName] = { checked: false, note: '' };
                }

                const taskChecked = monthData.tasks[taskName]?.checked || false;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'task-checkbox';
                checkbox.checked = taskChecked;
                checkbox.disabled = isYearFinalized;
                cell.appendChild(checkbox);

                if (checkbox.checked) cell.classList.add('task-completed');

                checkbox.addEventListener('change', () => {
                    if (hasConflict) return;
                    monthData.tasks[taskName].checked = checkbox.checked;
                    updateMonthlyStatus(monthData, allTaskNames);
                    cell.classList.toggle('task-completed', checkbox.checked);
                    saveClientDetails();
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

    function renderNotesTable(isYearFinalized) {
        const notesHeaderRow = notesTableHead.insertRow();
        notesHeaderRow.insertCell().textContent = '項目';
        monthsToDisplay.forEach(monthStr => {
            notesHeaderRow.insertCell().textContent = monthStr;
        });

        const urlRow = notesTableBody.insertRow();
        urlRow.insertCell().textContent = 'URL';
        const memoRow = notesTableBody.insertRow();
        memoRow.insertCell().textContent = 'メモ';

        monthsToDisplay.forEach(monthStr => {
            let monthData = clientDetails.monthly_tasks.find(mt => mt.month === monthStr);
             if (!monthData) {
                monthData = { month: monthStr, tasks: {}, url: '', memo: '' };
                clientDetails.monthly_tasks.push(monthData);
            }

            // URL Cell
            const urlCell = urlRow.insertCell();
            const urlInput = document.createElement('input');
            urlInput.type = 'text';
            urlInput.value = monthData.url || '';
            urlInput.placeholder = 'URLを入力';
            urlInput.disabled = isYearFinalized;
            urlInput.addEventListener('input', (e) => {
                if (hasConflict) return;
                monthData.url = e.target.value;
                saveClientDetails();
            });
            urlCell.appendChild(urlInput);

            // Memo Cell
            const memoCell = memoRow.insertCell();
            const memoTextarea = document.createElement('textarea');
            memoTextarea.value = monthData.memo || '';
            memoTextarea.placeholder = 'メモを入力';
            memoTextarea.rows = 12;
            memoTextarea.disabled = isYearFinalized;
            memoTextarea.addEventListener('input', (e) => {
                if (hasConflict) return;
                monthData.memo = e.target.value;
                saveClientDetails();
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

    // --- Run Application ---
    initializeApp();
});
