// data.js

// localStorageからデータをロードする関数
/*function loadData() {
    const storedClients = localStorage.getItem('clients');
    const storedClientDetails = localStorage.getItem('clientDetails');
    const storedStaffs = localStorage.getItem('staffs'); // staffsも取得

    let initialClients = [
        { no: 101, name: "株式会社アルファ", fiscalMonth: "1月", unattendedMonths: "7ヵ月", monthlyProgress: "2026年1月迄",担当者: "佐藤", accountingMethod: "記帳代行" , status: "完了" },
        { no: 103, name: "合同会社ベータ", fiscalMonth: "1月", unattendedMonths: "7ヵ月", monthlyProgress: "2026年1月迄",担当者: "鈴木", accountingMethod: "自計" , status: "完了" },
        { no: 201, name: "株式会社ガンマ", fiscalMonth: "2月", unattendedMonths: "6ヵ月", monthlyProgress: "2026年2月迄",担当者: "高橋", accountingMethod: "自計" , status: "完了" },
        { no: 301, name: "有限会社デルタ", fiscalMonth: "3月", unattendedMonths: "5ヵ月", monthlyProgress: "2026年3月迄",担当者: "田中", accountingMethod: "記帳代行" , status: "2チェック待ち" },
        { no: 308, name: "株式会社イプシロン", fiscalMonth: "3月", unattendedMonths: "5ヵ月", monthlyProgress: "2026年3月迄",担当者: "渡辺", accountingMethod: "記帳代行" , status: "依頼中" },
        {"no":400,"name":"サンプル会社400","fiscalMonth":"1月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":401,"name":"サンプル会社401","fiscalMonth":"2月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":402,"name":"サンプル会社402","fiscalMonth":"3月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":403,"name":"サンプル会社403","fiscalMonth":"4月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":404,"name":"サンプル会社404","fiscalMonth":"5月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"},
        {"no":405,"name":"サンプル会社405","fiscalMonth":"6月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":406,"name":"サンプル会社406","fiscalMonth":"7月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":407,"name":"サンプル会社407","fiscalMonth":"8月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":408,"name":"サンプル会社408","fiscalMonth":"9月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":409,"name":"サンプル会社409","fiscalMonth":"10月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"},
        {"no":410,"name":"サンプル会社410","fiscalMonth":"11月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":411,"name":"サンプル会社411","fiscalMonth":"12月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":412,"name":"サンプル会社412","fiscalMonth":"1月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":413,"name":"サンプル会社413","fiscalMonth":"2月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":414,"name":"サンプル会社414","fiscalMonth":"3月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"},
        {"no":415,"name":"サンプル会社415","fiscalMonth":"4月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":416,"name":"サンプル会社416","fiscalMonth":"5月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":417,"name":"サンプル会社417","fiscalMonth":"6月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":418,"name":"サンプル会社418","fiscalMonth":"7月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":419,"name":"サンプル会社419","fiscalMonth":"8月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"}
    ];

    // 担当者リストをinitialClientsから自動生成
    const uniqueStaffs = [...new Set(initialClients.map(client => client.担当者))];
    // uniqueStaffs をオブジェクトの配列に変換し、no を付与
    let initialStaffs = uniqueStaffs.sort().map((name, index) => ({ no: index + 1, name: name }));

    let initialClientDetails = [
        {
            no: 101, name: "株式会社アルファ", fiscalMonth: "1月",担当者: "佐藤",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" }
            ]
        },
        {
            no: 103, name: "合同会社ベータ", fiscalMonth: "1月",担当者: "鈴木",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" }
            ]
        },
        {
            no: 201, name: "株式会社ガンマ", fiscalMonth: "2月",担当者: "高橋",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "13%", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: true, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "13%", url: "", memo: "" }
            ]
        },
        {
            no: 301, name: "有限会社デルタ", fiscalMonth: "3月",担当者: "田中",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" }
            ]
        },
        {
            no: 308, name: "株式会社イプシロン", fiscalMonth: "3月",担当者: "渡辺",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" }
            ]
        }
    ];

    const clients = storedClients ? JSON.parse(storedClients) : initialClients;
    const clientDetails = storedClientDetails ? JSON.parse(storedClientDetails) : initialClientDetails;
    const staffs = localStorage.getItem('staffs') ? JSON.parse(localStorage.getItem('staffs')) : initialStaffs; // staffsもlocalStorageからロード

    return { clients, clientDetails, staffs };
}

// localStorageにデータを保存する関数
function saveData(clients, clientDetails, staffs) {
    localStorage.setItem('clients', JSON.stringify(clients));
    localStorage.setItem('clientDetails', JSON.stringify(clientDetails));
    localStorage.setItem('staffs', JSON.stringify(staffs)); // staffsも保存
}

// グローバル変数としてエクスポート
const data = loadData();
window.clients = data.clients;
window.clientDetails = data.clientDetails;
window.staffs = data.staffs;
*/











// data.js

// localStorageからデータをロードする関数
function loadData() {
    const storedClients = localStorage.getItem('clients');
    const storedClientDetails = localStorage.getItem('clientDetails');
    const storedStaffs = localStorage.getItem('staffs'); // staffsも取得

    let initialClients = [
        { no: 101, name: "株式会社アルファ", fiscalMonth: "1月", unattendedMonths: "7ヵ月", monthlyProgress: "2026年1月迄",担当者: "佐藤", accountingMethod: "記帳代行" , status: "完了" },
        { no: 103, name: "合同会社ベータ", fiscalMonth: "1月", unattendedMonths: "7ヵ月", monthlyProgress: "2026年1月迄",担当者: "鈴木", accountingMethod: "自計" , status: "完了" },
        { no: 201, name: "株式会社ガンマ", fiscalMonth: "2月", unattendedMonths: "6ヵ月", monthlyProgress: "2026年2月迄",担当者: "高橋", accountingMethod: "自計" , status: "完了" },
        { no: 301, name: "有限会社デルタ", fiscalMonth: "3月", unattendedMonths: "5ヵ月", monthlyProgress: "2026年3月迄",担当者: "田中", accountingMethod: "記帳代行" , status: "2チェック待ち" },
        { no: 308, name: "株式会社イプシロン", fiscalMonth: "3月", unattendedMonths: "5ヵ月", monthlyProgress: "2026年3月迄",担当者: "渡辺", accountingMethod: "記帳代行" , status: "依頼中" },
        {"no":400,"name":"サンプル会社400","fiscalMonth":"1月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":401,"name":"サンプル会社401","fiscalMonth":"2月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":402,"name":"サンプル会社402","fiscalMonth":"3月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":403,"name":"サンプル会社403","fiscalMonth":"4月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":404,"name":"サンプル会社404","fiscalMonth":"5月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"},
        {"no":405,"name":"サンプル会社405","fiscalMonth":"6月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":406,"name":"サンプル会社406","fiscalMonth":"7月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":407,"name":"サンプル会社407","fiscalMonth":"8月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":408,"name":"サンプル会社408","fiscalMonth":"9月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":409,"name":"サンプル会社409","fiscalMonth":"10月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"},
        {"no":410,"name":"サンプル会社410","fiscalMonth":"11月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":411,"name":"サンプル会社411","fiscalMonth":"12月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":412,"name":"サンプル会社412","fiscalMonth":"1月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":413,"name":"サンプル会社413","fiscalMonth":"2月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":414,"name":"サンプル会社414","fiscalMonth":"3月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"},
        {"no":415,"name":"サンプル会社415","fiscalMonth":"4月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"佐藤","accountingMethod":"記帳代行","status":"未着手"},
        {"no":416,"name":"サンプル会社416","fiscalMonth":"5月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"鈴木","accountingMethod":"記帳代行","status":"未着手"},
        {"no":417,"name":"サンプル会社417","fiscalMonth":"6月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"高橋","accountingMethod":"記帳代行","status":"未着手"},
        {"no":418,"name":"サンプル会社418","fiscalMonth":"7月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"田中","accountingMethod":"記帳代行","status":"未着手"},
        {"no":419,"name":"サンプル会社419","fiscalMonth":"8月","unattendedMonths":"0ヵ月","monthlyProgress":"未開始","担当者":"渡辺","accountingMethod":"記帳代行","status":"未着手"}
    ];

    // 担当者リストをinitialClientsから自動生成
    const uniqueStaffs = [...new Set(initialClients.map(client => client.担当者))];
    // uniqueStaffs をオブジェクトの配列に変換し、no を付与
    let initialStaffs = uniqueStaffs.sort().map((name, index) => ({ no: index + 1, name: name }));

    let initialClientDetails = [
        {
            no: 101, name: "株式会社アルファ", fiscalMonth: "1月",担当者: "佐藤",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" }
            ]
        },
        {
            no: 103, name: "合同会社ベータ", fiscalMonth: "1月",担当者: "鈴木",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" }
            ]
        },
        {
            no: 201, name: "株式会社ガンマ", fiscalMonth: "2月",担当者: "高橋",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "13%", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: true, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "13%", url: "", memo: "" }
            ]
        },
        {
            no: 301, name: "有限会社デルタ", fiscalMonth: "3月",担当者: "田中",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: true, 入力: true, 会計チェック: true, 担当者解決: true, 不明点: true, 試算表作成: true, 代表報告: true, 仕分け確認: true, 先生ロック: true }, status: "月次完了", url: "", memo: "" }
            ]
        },
        {
            no: 308, name: "株式会社イプシロン", fiscalMonth: "3月",担当者: "渡辺",
            customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
            monthlyTasks: [
                { month: "2025年7月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" },
                { month: "2025年8月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" }
            ]
        },
        // ---------- ここから No.400〜419 の仮データ ----------
        ...Array.from({length: 20}, (_, i) => {
            const no = 400 + i;
            return {
                no: no,
                name: `サンプル会社${no}`,
                fiscalMonth: initialClients.find(c => c.no === no)?.fiscalMonth || "",
                担当者: initialClients.find(c => c.no === no)?.担当者 || "",
                customTasks: ["受付", "入力", "会計チェック", "担当者解決", "不明点", "試算表作成", "代表報告", "仕分け確認", "先生ロック"],
                monthlyTasks: [
                    { month: "2025年7月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" },
                    { month: "2025年8月", tasks: { 受付: false, 入力: false, 会計チェック: false, 担当者解決: false, 不明点: false, 試算表作成: false, 代表報告: false, 仕分け確認: false, 先生ロック: false }, status: "未入力", url: "", memo: "" }
                ]
            }
        })
    ];

    const clients = storedClients ? JSON.parse(storedClients) : initialClients;
    const clientDetails = storedClientDetails ? JSON.parse(storedClientDetails) : initialClientDetails;
    const staffs = localStorage.getItem('staffs') ? JSON.parse(localStorage.getItem('staffs')) : initialStaffs; // staffsもlocalStorageからロード

    return { clients, clientDetails, staffs };
}

// localStorageにデータを保存する関数
function saveData(clients, clientDetails, staffs) {
    localStorage.setItem('clients', JSON.stringify(clients));
    localStorage.setItem('clientDetails', JSON.stringify(clientDetails));
    localStorage.setItem('staffs', JSON.stringify(staffs)); // staffsも保存
}

// グローバル変数としてエクスポート
const data = loadData();
window.clients = data.clients;
window.clientDetails = data.clientDetails;
window.staffs = data.staffs;
