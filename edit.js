document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element Selectors ---
    const pageTitle = document.querySelector('h1');
    const clientNameDisplay = document.getElementById('client-name-display');
    const clientNoInput = document.getElementById('client-no');
    const clientNameInput = document.getElementById('client-name');
    const staffSelect = document.getElementById('staff-select');
    const fiscalMonthSelect = document.getElementById('fiscal-month');
    const accountingMethodSelect = document.getElementById('accounting-method');
    const saveButton = document.getElementById('save-button');

    // --- State Variables ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const urlParams = new URLSearchParams(window.location.search);
    const clientNo = urlParams.get('no') ? parseInt(urlParams.get('no')) : null;
    const isNewMode = clientNo === null;
    let currentClient = null;
    let staffs = [];

    // --- Initialization ---
    async function initializeApp() {
        try {
            staffs = await fetchStaffs();
            if (isNewMode) {
                await initializeNewMode();
            } else {
                await initializeEditMode();
            }
            initializeAllCustomDropdowns();
            saveButton.addEventListener('click', saveDataHandler);
        } catch (error) {
            console.error("Initialization failed:", error);
            pageTitle.textContent = 'エラー';
            document.getElementById('edit-form').innerHTML = '<p>ページの初期化中にエラーが発生しました。</p>';
        }
    }

    // --- Data Fetching ---
    async function fetchStaffs() {
        try {
            const response = await fetch(`${API_BASE_URL}/staffs`);
            if (!response.ok) throw new Error('Failed to fetch staffs');
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async function fetchClientDetails(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/clients/${id}`);
            if (!response.ok) throw new Error('Failed to fetch client details');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // --- Mode Initializers ---
    async function initializeNewMode() {
        pageTitle.textContent = '顧客新規登録';
        pageTitle.style.color = 'red';
        clientNameDisplay.style.display = 'none';
        clientNoInput.readOnly = false; // Allow editing for new clients
        populateDropdowns();
    }

    async function initializeEditMode() {
        currentClient = await fetchClientDetails(clientNo);
        if (currentClient) {
            pageTitle.textContent = '顧客情報編集';
            clientNameDisplay.textContent = currentClient.name;
            clientNoInput.value = currentClient.no;
            clientNoInput.readOnly = true; // Do not allow editing of existing client No.
            clientNameInput.value = currentClient.name;
            fiscalMonthSelect.value = parseInt(currentClient.fiscalMonth.replace('月', ''));
            accountingMethodSelect.value = currentClient.accounting_method;
            populateDropdowns(currentClient.staff_id);
        } else {
            pageTitle.textContent = 'エラー';
            document.getElementById('edit-form').innerHTML = '<p>指定されたクライアントが見つかりません。</p>';
        }
    }

    // --- Helper Functions ---
    function populateDropdowns(selectedStaffId = '') {
        staffSelect.innerHTML = '<option value="">選択してください</option>';
        staffs.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.no; // Use staff ID (no) as value
            option.textContent = staff.name;
            if (selectedStaffId === staff.no) {
                option.selected = true;
            }
            staffSelect.appendChild(option);
        });
    }

    function initializeAllCustomDropdowns() {
        document.querySelectorAll('.custom-select-wrapper').forEach(wrapper => {
            const select = wrapper.querySelector('.custom-select-target');
            if (select) {
                initializeCustomDropdown(select);
                const trigger = wrapper.querySelector('.custom-select-trigger');
                if (select.value) {
                    trigger.textContent = select.options[select.selectedIndex].textContent;
                } else {
                    trigger.textContent = select.options[0]?.textContent || '選択してください';
                }
            }
        });
    }

    // --- Save Logic ---
    async function saveDataHandler() {
        // --- Validation ---
        const clientData = {
            id: parseInt(clientNoInput.value),
            name: clientNameInput.value.trim(),
            staff_id: parseInt(staffSelect.value),
            fiscal_month: parseInt(fiscalMonthSelect.value.replace('月', '')), // Correctly parse the integer from string
            accounting_method: accountingMethodSelect.value,
            status: isNewMode ? '未着手' : currentClient.status, // Default for new, keep old for existing
        };

        if (!clientData.name || !clientData.staff_id || !clientData.fiscal_month || !clientData.accounting_method) {
            alert('すべての項目を入力または選択してください。');
            return;
        }
        if (isNaN(clientData.id) || clientData.id <= 0) {
            alert('No.は正の整数で入力してください。');
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = '保存中...';

        try {
            let response;
            if (isNewMode) {
                // --- Create New Client ---
                response = await fetch(`${API_BASE_URL}/clients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData),
                });
            } else {
                // --- Update Existing Client ---
                clientData.updated_at = currentClient.updated_at; // Add timestamp for optimistic locking
                response = await fetch(`${API_BASE_URL}/clients/${clientNo}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData),
                });
            }

            if (response.status === 409) {
                alert('データが他のユーザーによって更新されました。ページをリロードします。');
                window.location.reload();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '保存に失敗しました。');
            }

            const savedClient = await response.json();
            alert('保存しました！');
            window.location.href = `details.html?no=${savedClient.no}`;

        } catch (error) {
            alert(`エラー: ${error.message}`);
            saveButton.disabled = false;
            saveButton.textContent = '保存';
        }
    }

    // --- Run Application ---
    initializeApp();
});
