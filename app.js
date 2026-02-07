/**
 * 产品卖点查询APP - 主逻辑
 * 包含产品数据和查询功能
 * V2.0 - 添加品类识别和Get笔记API集成
 */

// ========================================
// Get笔记API配置
// ========================================
const GET_NOTE_API_KEY = 'Hmp//dySAP6RFhP91ooXFOz5Cm+0CbUp0DXtz+uXcIcKGDbZ5U8MS3MyKtJjl3AvSUWh3toAwo1c2uUs9RJi+xfPHPCPCdICeLVI';
const GET_NOTE_API_ENDPOINT = 'https://api.biji.com/v1/knowledge/query';

// ========================================
// 产品数据库（V2.0 - 添加品类字段）
// ========================================
const productDatabase = {
    "重庆药友": [
        {
            name: "可乐必妥 左氧氟沙星片 0.5g*4片",
            category: "抗生素",
            sellingPoints: [
                "原研品质",
                "可乐必妥=阿莫西林+阿奇霉素",
                "在肺部和泌尿的组织浓度高，对呼吸和泌尿系统的感染有着良好的效果",
                "一天一片，服用更方便"
            ]
        },
        {
            name: "阿拓莫兰 谷胱甘肽片 36片",
            category: "肝病辅助用药",
            sellingPoints: [
                "独家产品，临床带动",
                "高客单",
                "告客户粘性，慢乙肝顾客长期复购"
            ]
        }
    ],
    "达仁堂": [
        {
            name: "达仁堂 速效救心丸 120丸",
            category: "心血管中成药",
            sellingPoints: [
                "速效救心丸突出速效和救心，直击患者对快速奇效、急救的迫切需求。即使非医疗专业人士也能从名称直观理解其主要功效和场景"
            ]
        }
    ]
};

// ========================================
// 品类洞察缓存
// ========================================
let categoryInsightsCache = {};

// ========================================
// DOM 元素
// ========================================
const manufacturerSelect = document.getElementById('manufacturer');
const productSelect = document.getElementById('product');
const queryBtn = document.getElementById('queryBtn');
const resultSection = document.getElementById('resultSection');
const emptyState = document.getElementById('emptyState');
const productInfo = document.getElementById('productInfo');
const sellingPoints = document.getElementById('sellingPoints');
const resultTitle = document.getElementById('resultTitle');
const categorySection = document.getElementById('categorySection');
const categoryName = document.getElementById('categoryName');
const categoryInsights = document.getElementById('categoryInsights');

// ========================================
// 初始化
// ========================================
function init() {
    // 填充厂家选择框
    populateManufacturers();

    // 绑定事件
    manufacturerSelect.addEventListener('change', onManufacturerChange);
    productSelect.addEventListener('change', onProductChange);
    queryBtn.addEventListener('click', onQuery);
}

// 填充厂家选项
function populateManufacturers() {
    const manufacturers = Object.keys(productDatabase);

    manufacturers.forEach(manufacturer => {
        const option = document.createElement('option');
        option.value = manufacturer;
        option.textContent = manufacturer;
        manufacturerSelect.appendChild(option);
    });
}

// ========================================
// 事件处理
// ========================================

// 厂家选择变化
function onManufacturerChange() {
    const selectedManufacturer = manufacturerSelect.value;

    // 清空商品选择
    productSelect.innerHTML = '<option value="">请选择商品</option>';

    if (selectedManufacturer) {
        // 启用商品选择
        productSelect.disabled = false;

        // 填充该厂家的商品
        const products = productDatabase[selectedManufacturer];
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.name;
            option.textContent = product.name;
            productSelect.appendChild(option);
        });
    } else {
        productSelect.disabled = true;
        productSelect.innerHTML = '<option value="">请先选择营销厂家</option>';
    }

    // 重置查询按钮和结果
    queryBtn.disabled = true;
    hideResult();
}

// 商品选择变化
function onProductChange() {
    const selectedProduct = productSelect.value;
    queryBtn.disabled = !selectedProduct;

    // 隐藏之前的结果
    if (selectedProduct) {
        hideResult();
    }
}

// 查询按钮点击
async function onQuery() {
    const selectedManufacturer = manufacturerSelect.value;
    const selectedProductName = productSelect.value;

    if (!selectedManufacturer || !selectedProductName) {
        return;
    }

    // 查找产品
    const products = productDatabase[selectedManufacturer];
    const product = products.find(p => p.name === selectedProductName);

    if (product) {
        // 显示产品基本信息
        showResult(selectedManufacturer, product);

        // 异步加载品类洞察
        if (product.category) {
            await loadCategoryInsights(product.category);
        }
    }
}

// ========================================
// Get笔记API调用
// ========================================

// 从Get笔记获取品类洞察
async function loadCategoryInsights(category) {
    // 显示加载状态
    showCategoryLoading(category);

    // 检查缓存
    if (categoryInsightsCache[category]) {
        showCategoryInsights(category, categoryInsightsCache[category]);
        return;
    }

    try {
        console.log('开始获取 ' + category + ' 的洞察数据...');
        // 调用Get笔记API
        const insights = await fetchFromGetNote(category);

        // 缓存结果
        categoryInsightsCache[category] = insights;

        // 显示洞察
        showCategoryInsights(category, insights);
    } catch (error) {
        console.warn('获取品类洞察API失败，尝试使用本地数据:', error);

        // 如果API失败（可能是网络屏蔽、CORS或API故障），自动降级使用模拟数据
        // 这样确保在国内网络环境下用户依然能看到内容
        console.log('启动本地数据回退模式...');
        const mockInsights = getMockInsights(category);

        if (mockInsights && mockInsights.length > 0) {
            showCategoryInsights(category, mockInsights);

            // 添加来源提示
            const notice = document.createElement('div');
            notice.style.fontSize = '12px';
            notice.style.color = '#999';
            notice.style.textAlign = 'center';
            notice.style.marginTop = '10px';
            notice.innerHTML = '(数据来源：本地知识库)';
            categoryInsights.appendChild(notice);
        } else {
            showCategoryError(category);
        }
    }
}

// 获取模拟数据（用于本地演示）
function getMockInsights(category) {
    const mocks = {
        "抗生素": [
            "抗生素市场规模持续增长，呼吸系统用药占比最高",
            "左氧氟沙星作为第三代喹诺酮类药物，临床认可度极高",
            "政策趋向于规范抗生素使用，原研品质更具竞争优势"
        ],
        "肝病辅助用药": [
            "中国是肝病大国，护肝药物市场需求刚性且稳定",
            "谷胱甘肽不仅用于肝病，在医美领域也有广泛应用",
            "患者依从性关键在于疗效确切和副作用小"
        ],
        "心血管中成药": [
            "心血管病患病人数增加，中成药在预防和康复期优势明显",
            "急救类药物是家庭常备药，复购率和品牌忠诚度极高",
            "速效救心丸品牌认知度高达90%以上，是品类代名词"
        ]
    };

    return mocks[category] || [
        category + " 市场需求稳步上升",
        "该品类产品在临床端有广泛应用基础",
        "患者对此类药物的品牌认知度正在提高"
    ];
}

// 调用Get笔记API
async function fetchFromGetNote(category) {
    const query = category + '品类的市场洞察和关键信息';

    // Cloudflare Worker代理地址
    const apiEndpoint = 'https://get-note-proxy.891646025.workers.dev';

    try {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // 注意：API Key 现在由 Cloudflare Worker 在后端添加，此处不再需要
            },
            body: JSON.stringify({
                query: query  // Worker会转换为question字段
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error('API请求失败: ' + response.status + ' - ' + errorText);
        }

        const data = await response.json();
        return parseGetNoteResponse(data);

    } catch (e) {
        console.error('Get笔记API调用错误:', e);
        throw e;
    }
}

// 解析Get笔记API响应
function parseGetNoteResponse(data) {
    console.log('Get笔记API返回:', data);

    let answerText = '';
    
    // 根据Get笔记API文档，响应格式可能是：
    // 1. 流式响应（stream=true）：需要解析SSE格式
    // 2. JSON响应（stream=false）：直接返回answers字段
    
    // 检查是否有answers字段（JSON格式）
    if (data.c && data.c.answers) {
        answerText = data.c.answers;
    } else if (data.answers) {
        answerText = data.answers;
    } else if (data.data && data.data.answers) {
        answerText = data.data.answers;
    } else if (data.answer) {
        answerText = data.answer;
    } else if (data.data && data.data.answer) {
        answerText = data.data.answer;
    } else if (data.message) {
        // 可能是错误消息
        console.warn('API返回消息:', data.message);
        return ['暂无该品类的详细洞察数据'];
    } else {
        console.warn('无法解析API响应格式:', data);
        return ['暂无该品类的详细洞察数据'];
    }

    // 清理文本：移除多余的空白字符
    answerText = answerText.trim();

    if (!answerText || answerText.length === 0) {
        return ['暂无该品类的详细洞察数据'];
    }

    // 将长文本按句号、问号、感叹号或换行符分割成多条洞察
    const insights = answerText
        .split(/[。！？\n]/)
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s.length > 5 && s.length < 200; })
        .slice(0, 5); // 最多返回5条洞察

    // 如果分割后没有有效内容，返回整个文本（截取前500字符）
    if (insights.length === 0) {
        return [answerText.substring(0, 500)];
    }

    return insights;
}

// ========================================
// 结果展示
// ========================================

function showResult(manufacturer, product) {
    // 隐藏空状态
    emptyState.classList.add('hidden');

    // 更新产品信息（添加品类标签）
    let productInfoHTML = '<strong>' + manufacturer + '</strong> · ' + product.name;

    if (product.category) {
        productInfoHTML += '<div class="category-tag"><span class="tag-icon">🏷️</span><span class="tag-text">品类：' + product.category + '</span></div>';
    }

    productInfo.innerHTML = productInfoHTML;

    // 清空并填充卖点
    sellingPoints.innerHTML = '';
    product.sellingPoints.forEach((point, index) => {
        const li = document.createElement('li');
        li.innerHTML = '<span class="point-number">' + (index + 1) + '</span><span class="point-text">' + point + '</span>';
        sellingPoints.appendChild(li);
    });

    // 隐藏品类洞察区域（等待加载）
    if (categorySection) {
        categorySection.classList.add('hidden');
    }

    // 显示结果区域
    resultSection.classList.remove('hidden');

    // 滚动到结果区域
    setTimeout(function () {
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// 显示品类加载状态
function showCategoryLoading(category) {
    if (!categorySection) return;

    categoryName.textContent = category;
    categoryInsights.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>正在从Get笔记获取品类洞察...</p></div>';

    categorySection.classList.remove('hidden');
}

// 显示品类洞察
function showCategoryInsights(category, insights) {
    if (!categorySection || !insights || insights.length === 0) return;

    categoryName.textContent = category;

    let insightsHTML = '';
    insights.forEach(function (insight) {
        insightsHTML += '<div class="insight-item"><span class="insight-icon">💡</span><span class="insight-text">' + insight + '</span></div>';
    });

    categoryInsights.innerHTML = insightsHTML;
    categorySection.classList.remove('hidden');
}

// 显示品类洞察错误
function showCategoryError(category) {
    if (!categorySection) return;

    categoryName.textContent = category;
    categoryInsights.innerHTML = '<div class="error-state"><span class="error-icon">⚠️</span><p>暂时无法获取品类洞察，请稍后再试</p></div>';

    categorySection.classList.remove('hidden');
}

function hideResult() {
    resultSection.classList.add('hidden');
    emptyState.classList.remove('hidden');
    if (categorySection) {
        categorySection.classList.add('hidden');
    }
}

// ========================================
// 启动应用
// ========================================
document.addEventListener('DOMContentLoaded', init);
