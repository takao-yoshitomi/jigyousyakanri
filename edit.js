document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element Selectors ---
    const pageTitle = document.querySelector('h1');
    const clientNameDisplay = document.getElementById('client-name-display');
    const clientNoInput = document.getElementById('client-no');
    const clientNameInput = document.getElementById('client-name');
    const staffSelect = document.getElementById('staff-select');
    const fiscalMonthSelect = document.getElementById('fiscal-month');
    const accountingMethodSelect = document.getElementById('accounting-method');
    const statusSelect = document.getElementById('status-select'); // 追加
    const saveButton = document.getElementById('save-button');

    // --- State Variables ---
    const API_BASE_URL = 'http://localhost:5001/api';
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('no') ? parseInt(urlParams.get('no')) : null;
    const isNewMode = clientId === null;
    let currentClient = null;
    let staffs = [];

    // --- Initialization ---
    async function initializeApp() {
        try {
            staffs = await fetchStaffs();
            if (isNewMode) {
                initializeNewMode();
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
            if (!response.ok) throw new Error('担当者リストの取得に失敗しました。');
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async function fetchClientDetails(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/clients/${id}`);
            if (response.status === 404) return null;
            if (!response.ok) throw new Error('顧客詳細の取得に失敗しました。');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // --- Mode Initializers ---
    function initializeNewMode() {
        pageTitle.textContent = '顧客新規登録';
        pageTitle.style.color = 'red';
        clientNameDisplay.style.display = 'none';
        clientNoInput.readOnly = false;
        populateStaffDropdown();
        statusSelect.value = '未着手'; // 新規作成時のデフォルト
    }

    async function initializeEditMode() {
        currentClient = await fetchClientDetails(clientId);
        if (currentClient) {
            pageTitle.textContent = '顧客情報編集';
            clientNameDisplay.textContent = currentClient.name;
            clientNoInput.value = currentClient.id;
            clientNoInput.readOnly = true;
            clientNameInput.value = currentClient.name;
            
            populateStaffDropdown(currentClient.staff_id);

            fiscalMonthSelect.value = `${currentClient.fiscal_month}月`;
            accountingMethodSelect.value = currentClient.accounting_method;
            statusSelect.value = currentClient.status; // 編集時にステータスを設定

        } else {
            pageTitle.textContent = 'エラー';
            document.getElementById('edit-form').innerHTML = '<p>指定されたクライアントが見つかりません。</p>';
            saveButton.disabled = true;
        }
    }

    // --- Helper Functions ---
    function populateStaffDropdown(selectedStaffId = null) {
        staffSelect.innerHTML = '<option value="">選択してください</option>';
        staffs.forEach(staff => {
            const option = document.createElement('option');
            option.value = staff.id;
            option.textContent = staff.name;
            if (selectedStaffId !== null && staff.id === selectedStaffId) {
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
                if (select.value && select.selectedIndex > -1) {
                    trigger.textContent = select.options[select.selectedIndex].textContent;
                } else {
                    trigger.textContent = select.options[0]?.textContent || '選択してください';
                }
            }
        });
    }

    // --- Save Logic ---
    async function saveDataHandler() {
        const clientNoValue = clientNoInput.value.trim();
        const clientData = {
            ...(isNewMode && { id: parseInt(clientNoValue) }),
            name: clientNameInput.value.trim(),
            staff_id: parseInt(staffSelect.value),
            fiscal_month: parseInt(fiscalMonthSelect.value.replace('月', '')),
            accounting_method: accountingMethodSelect.value,
            status: statusSelect.value, // statusをリクエストに追加
        };

        if (isNewMode && !clientNoValue) {
            alert('No.を入力してください。');
            return;
        }
        if (isNewMode && (isNaN(clientData.id) || clientData.id <= 0)) {
            alert('No.は正の整数で入力してください。');
            return;
        }
        if (!clientData.name || !clientData.staff_id || !clientData.fiscal_month || !clientData.accounting_method || !clientData.status) {
            alert('すべての必須項目を入力または選択してください。');
            return;
        }
        
        saveButton.disabled = true;
        saveButton.textContent = '保存中...';

        try {
            let response;
            if (isNewMode) {
                response = await fetch(`${API_BASE_URL}/clients`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData),
                });
            } else {
                clientData.updated_at = currentClient.updated_at;
                response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData),
                });
            }

            if (response.status === 409) {
                const errorData = await response.json();
                alert(errorData.error || 'データが競合しました。ページをリロードします。');
                window.location.reload();
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '保存に失敗しました。');
            }

            const savedClient = await response.json();
            alert('保存しました！');
            window.location.href = 'index.html';

        } catch (error) {
            alert(`エラー: ${error.message}`);
            saveButton.disabled = false;
            saveButton.textContent = '保存';
        }
    }

    // --- Run Application ---
    initializeApp();
});