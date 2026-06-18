import { computed, onMounted, ref } from 'vue';
import Chart from 'primevue/chart';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import Select from 'primevue/select';
import { formatCurrency, getOrders } from '../services/orderApi';
import { getLowStock, getProducts } from '../services/productApi';
import { getDashboardReport, getRevenueChart, } from '../services/userApi';
const report = ref(null);
const chart = ref(null);
const groupBy = ref('day');
const loading = ref(true);
const error = ref('');
const warehouseStats = ref({
    productCount: 0,
    totalStock: 0,
    lowStockCount: 0,
    inventoryValue: 0,
    productsSoldThisMonth: 0,
});
const groupOptions = [
    { label: 'Theo ngày', value: 'day' },
    { label: 'Theo tháng', value: 'month' },
];
const chartColors = ['#4f46e5', '#0f766e', '#0284c7', '#d97706', '#db2777', '#64748b'];
const revenueSegments = computed(() => {
    const labels = chart.value?.labels ?? [];
    const revenue = chart.value?.revenue ?? [];
    const orderCount = chart.value?.orderCount ?? [];
    const items = labels
        .map((label, index) => ({
        label,
        revenue: revenue[index] ?? 0,
        orders: orderCount[index] ?? 0,
    }))
        .filter((item) => item.revenue > 0)
        .sort((first, second) => second.revenue - first.revenue);
    if (items.length <= 6)
        return items;
    const leading = items.slice(0, 5);
    const remaining = items.slice(5);
    return [
        ...leading,
        {
            label: 'Khác',
            revenue: remaining.reduce((sum, item) => sum + item.revenue, 0),
            orders: remaining.reduce((sum, item) => sum + item.orders, 0),
        },
    ];
});
const totalChartRevenue = computed(() => revenueSegments.value.reduce((sum, item) => sum + item.revenue, 0));
const totalChartOrders = computed(() => revenueSegments.value.reduce((sum, item) => sum + item.orders, 0));
const averageOrderValue = computed(() => totalChartOrders.value ? totalChartRevenue.value / totalChartOrders.value : 0);
const revenueLegend = computed(() => revenueSegments.value.map((item, index) => ({
    ...item,
    color: chartColors[index % chartColors.length],
    percentage: totalChartRevenue.value
        ? Math.round((item.revenue / totalChartRevenue.value) * 100)
        : 0,
})));
const chartData = computed(() => ({
    labels: revenueSegments.value.map((item) => item.label),
    datasets: [
        {
            label: 'Doanh thu',
            data: revenueSegments.value.map((item) => item.revenue),
            backgroundColor: revenueSegments.value.map((_, index) => chartColors[index % chartColors.length]),
            borderColor: '#ffffff',
            borderWidth: 4,
            hoverBorderColor: '#ffffff',
            hoverBorderWidth: 4,
            hoverOffset: 8,
        },
    ],
}));
const chartOptions = {
    maintainAspectRatio: false,
    cutout: '72%',
    layout: { padding: 12 },
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: '#111827',
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
                label: (context) => ` ${formatCurrency(Number(context.raw ?? 0))}`,
            },
        },
    },
};
function calculateWarehouseStats(allProducts, allOrders) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    let productsSoldThisMonth = 0;
    for (const order of allOrders) {
        if (order.status === 'Cancelled')
            continue;
        if (new Date(order.createdAt) >= startOfMonth) {
            for (const item of order.orderItems) {
                productsSoldThisMonth += item.quantity;
            }
        }
    }
    return {
        productCount: allProducts.length,
        totalStock: allProducts.reduce((sum, p) => sum + p.quantity, 0),
        lowStockCount: allProducts.filter((p) => p.quantity <= p.reserveStock).length,
        inventoryValue: allProducts.reduce((sum, p) => sum + p.importPrice * p.quantity, 0),
        productsSoldThisMonth,
    };
}
async function loadWarehouseStats(allOrders) {
    try {
        const [allProducts, lowStock] = await Promise.all([getProducts(), getLowStock()]);
        const orders = allOrders ?? await getOrders();
        warehouseStats.value = {
            ...calculateWarehouseStats(allProducts, orders),
            lowStockCount: lowStock.length,
        };
    }
    catch {
        warehouseStats.value = {
            productCount: 0, totalStock: 0, lowStockCount: 0, inventoryValue: 0, productsSoldThisMonth: 0,
        };
    }
}
function calculateReport(allOrders) {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const day = startOfToday.getDay();
    const diffToMonday = startOfToday.getDate() - (day === 0 ? 6 : day - 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    let revenueToday = 0;
    let revenueThisWeek = 0;
    let revenueThisMonth = 0;
    const productMap = {};
    const customerMap = {};
    const activeOrders = allOrders.filter(o => o.status !== 'Cancelled');
    for (const order of activeOrders) {
        const orderDate = new Date(order.createdAt);
        if (orderDate >= startOfToday) {
            revenueToday += order.total;
        }
        if (orderDate >= startOfWeek) {
            revenueThisWeek += order.total;
        }
        if (orderDate >= startOfMonth) {
            revenueThisMonth += order.total;
        }
        for (const item of order.orderItems) {
            if (!productMap[item.productId]) {
                productMap[item.productId] = {
                    productId: item.productId,
                    productName: item.productName || `Sản phẩm #${item.productId}`,
                    quantitySold: 0,
                    revenue: 0
                };
            }
            const pm = productMap[item.productId];
            pm.quantitySold += item.quantity;
            pm.revenue += item.subTotal;
        }
        const custName = order.customerName || 'Khách lẻ';
        const key = order.customerId ? String(order.customerId) : custName;
        if (!customerMap[key]) {
            customerMap[key] = {
                customerId: order.customerId,
                customerName: custName,
                orderCount: 0,
                revenue: 0,
                debt: 0
            };
        }
        customerMap[key].orderCount += 1;
        customerMap[key].revenue += order.total;
        customerMap[key].debt += order.debtAmount;
    }
    const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    const topCustomers = Object.values(customerMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);
    return {
        revenueToday,
        revenueThisWeek,
        revenueThisMonth,
        orderCount: activeOrders.length,
        topProducts,
        topCustomers
    };
}
function calculateChart(allOrders, groupByMode) {
    const activeOrders = allOrders.filter(o => o.status !== 'Cancelled');
    activeOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const groups = {};
    for (const order of activeOrders) {
        const date = new Date(order.createdAt);
        let key = '';
        if (groupByMode === 'day') {
            const dayStr = String(date.getDate()).padStart(2, '0');
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            key = `${dayStr}/${monthStr}`;
        }
        else {
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const yearStr = date.getFullYear();
            key = `${monthStr}/${yearStr}`;
        }
        if (!groups[key]) {
            groups[key] = { revenue: 0, orderCount: 0 };
        }
        groups[key].revenue += order.total;
        groups[key].orderCount += 1;
    }
    const keys = Object.keys(groups);
    const limit = groupByMode === 'day' ? 7 : 6;
    const slicedKeys = keys.slice(-limit);
    const labels = [];
    const revenue = [];
    const orderCount = [];
    for (const k of slicedKeys) {
        labels.push(k);
        revenue.push(groups[k]?.revenue ?? 0);
        orderCount.push(groups[k]?.orderCount ?? 0);
    }
    return {
        groupBy: groupByMode,
        from: '',
        to: '',
        labels,
        revenue,
        orderCount
    };
}
async function load() {
    loading.value = true;
    error.value = '';
    try {
        const [apiReport, apiChart] = await Promise.all([
            getDashboardReport(),
            getRevenueChart(groupBy.value),
        ]);
        if (apiReport && (apiReport.orderCount > 0 || apiReport.revenueToday > 0 || apiReport.revenueThisMonth > 0)) {
            report.value = apiReport;
            chart.value = apiChart;
            await loadWarehouseStats();
        }
        else {
            const allOrders = await getOrders();
            report.value = calculateReport(allOrders);
            chart.value = calculateChart(allOrders, groupBy.value);
            await loadWarehouseStats(allOrders);
        }
    }
    catch (exception) {
        console.warn("Reports API error, falling back to local orders calculation:", exception);
        try {
            const allOrders = await getOrders();
            report.value = calculateReport(allOrders);
            chart.value = calculateChart(allOrders, groupBy.value);
            await loadWarehouseStats(allOrders);
        }
        catch (fallbackException) {
            error.value = fallbackException instanceof Error ? fallbackException.message : 'Không thể tải báo cáo.';
        }
    }
    finally {
        loading.value = false;
    }
}
onMounted(load);
const __VLS_ctx = (({}));
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-chart-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['legend-percentage']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({ class: 'page' }));
/** @type {__VLS_StyleScopedClasses['page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'page-head' }));
/** @type {__VLS_StyleScopedClasses['page-head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.Select} */
Select;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0(({
	'onChange': {},
	modelValue: __VLS_ctx.groupBy,
	options: __VLS_ctx.groupOptions,
	optionLabel: 'label',
	optionValue: 'value'
})));
const __VLS_2 = __VLS_1(({
	'onChange': {},
	modelValue: __VLS_ctx.groupBy,
	options: __VLS_ctx.groupOptions,
	optionLabel: 'label',
	optionValue: 'value'
}), ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_5;
const __VLS_6 = {
    /** @type {typeof __VLS_5.change} */
    onChange: (__VLS_ctx.load),
};
var __VLS_3;
var __VLS_4;
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'alert error' }));
    /** @type {__VLS_StyleScopedClasses['alert']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'empty' }));
    /** @type {__VLS_StyleScopedClasses['empty']} */ ;
}
else if (__VLS_ctx.report) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'stats' }));
    /** @type {__VLS_StyleScopedClasses['stats']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-wallet stat-icon purple' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-wallet']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['purple']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatCurrency(__VLS_ctx.report.revenueToday));
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-calendar stat-icon blue' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-calendar']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['blue']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatCurrency(__VLS_ctx.report.revenueThisWeek));
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-chart-line stat-icon green' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chart-line']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['green']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatCurrency(__VLS_ctx.report.revenueThisMonth));
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-shopping-cart stat-icon orange' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-shopping-cart']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['orange']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.report.orderCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'stats warehouse-stats' }));
    /** @type {__VLS_StyleScopedClasses['stats']} */ ;
    /** @type {__VLS_StyleScopedClasses['warehouse-stats']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-box stat-icon teal' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-box']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['teal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.warehouseStats.productCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-database stat-icon indigo' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-database']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['indigo']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.warehouseStats.totalStock);
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-exclamation-triangle stat-icon red' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-exclamation-triangle']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['red']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.warehouseStats.lowStockCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-money-bill stat-icon yellow' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-money-bill']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['yellow']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatCurrency(__VLS_ctx.warehouseStats.inventoryValue));
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag stat-icon cyan' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
    /** @type {__VLS_StyleScopedClasses['stat-icon']} */ ;
    /** @type {__VLS_StyleScopedClasses['cyan']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.warehouseStats.productsSoldThisMonth);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'grid-2' }));
    /** @type {__VLS_StyleScopedClasses['grid-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(({ class: 'panel' }));
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'panel-heading' }));
    /** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.groupBy === 'day' ? 'Theo ngày' : 'Theo tháng');
    if (__VLS_ctx.revenueSegments.length) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'revenue-chart-layout' }));
        /** @type {__VLS_StyleScopedClasses['revenue-chart-layout']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'chart-left-block' }));
        /** @type {__VLS_StyleScopedClasses['chart-left-block']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'donut-wrap' }));
        /** @type {__VLS_StyleScopedClasses['donut-wrap']} */ ;
        let __VLS_7;
        /** @ts-ignore @type { | typeof __VLS_components.Chart} */
        Chart;
        // @ts-ignore
        const __VLS_8 = __VLS_asFunctionalComponent1(__VLS_7, new __VLS_7({
            type: "doughnut",
            data: (__VLS_ctx.chartData),
            options: (__VLS_ctx.chartOptions),
        }));
        const __VLS_9 = __VLS_8({
            type: "doughnut",
            data: (__VLS_ctx.chartData),
            options: (__VLS_ctx.chartOptions),
        }, ...__VLS_functionalComponentArgsRest(__VLS_8));
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'donut-below-summary' }));
        /** @type {__VLS_StyleScopedClasses['donut-below-summary']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
        (__VLS_ctx.formatCurrency(__VLS_ctx.totalChartRevenue));
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
        (__VLS_ctx.totalChartOrders);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'revenue-legend' }));
        /** @type {__VLS_StyleScopedClasses['revenue-legend']} */ ;
        for (const [item] of __VLS_vFor((__VLS_ctx.revenueLegend))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
                key: (item.label),
            });
            __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ style: { backgroundColor: item.color } }));
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
            (item.label);
            __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
            (item.orders);
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'legend-percentage' }));
            /** @type {__VLS_StyleScopedClasses['legend-percentage']} */ ;
            (item.percentage);
            // @ts-ignore
            [groupBy, groupBy, groupOptions, load, error, error, loading, report, report, report, report, report, formatCurrency, formatCurrency, formatCurrency, formatCurrency, formatCurrency, warehouseStats, warehouseStats, warehouseStats, warehouseStats, warehouseStats, revenueSegments, chartData, chartOptions, totalChartRevenue, totalChartOrders, revenueLegend,];
        }
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'chart-empty' }));
        /** @type {__VLS_StyleScopedClasses['chart-empty']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i, __VLS_intrinsics.i)(({ class: 'pi pi-chart-pie' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-chart-pie']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'chart-summary' }));
    /** @type {__VLS_StyleScopedClasses['chart-summary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.totalChartOrders);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.formatCurrency(__VLS_ctx.averageOrderValue));
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(({ class: 'panel' }));
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    let __VLS_12;
    /** @ts-ignore @type { | typeof __VLS_components.DataTable | typeof __VLS_components.DataTable} */
    DataTable;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent1(__VLS_12, new __VLS_12({
        value: (__VLS_ctx.report.topProducts),
        stripedRows: true,
    }));
    const __VLS_14 = __VLS_13({
        value: (__VLS_ctx.report.topProducts),
        stripedRows: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    const { default: __VLS_17 } = __VLS_15.slots;
    let __VLS_18;
    /** @ts-ignore @type { | typeof __VLS_components.Column} */
    Column;
    // @ts-ignore
    const __VLS_19 = __VLS_asFunctionalComponent1(__VLS_18, new __VLS_18({
        field: "productName",
        header: "Sản phẩm",
    }));
    const __VLS_20 = __VLS_19({
        field: "productName",
        header: "Sản phẩm",
    }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    let __VLS_23;
    /** @ts-ignore @type { | typeof __VLS_components.Column} */
    Column;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent1(__VLS_23, new __VLS_23({
        field: "quantitySold",
        header: "Đã bán",
    }));
    const __VLS_25 = __VLS_24({
        field: "quantitySold",
        header: "Đã bán",
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    let __VLS_28;
    /** @ts-ignore @type { | typeof __VLS_components.Column | typeof __VLS_components.Column} */
    Column;
    // @ts-ignore
    const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28({
        header: "Doanh thu",
    }));
    const __VLS_30 = __VLS_29({
        header: "Doanh thu",
    }, ...__VLS_functionalComponentArgsRest(__VLS_29));
    const { default: __VLS_33 } = __VLS_31.slots;
    {
        const { body: __VLS_34 } = __VLS_31.slots;
        const [{ data }] = __VLS_vSlot(__VLS_34);
        (__VLS_ctx.formatCurrency(data.revenue));
        // @ts-ignore
        [report, formatCurrency, formatCurrency, totalChartOrders, averageOrderValue,];
    }
    // @ts-ignore
    [];
    var __VLS_31;
    // @ts-ignore
    [];
    var __VLS_15;
    __VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(({ class: 'panel' }));
    /** @type {__VLS_StyleScopedClasses['panel']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
    let __VLS_35;
    /** @ts-ignore @type { | typeof __VLS_components.DataTable | typeof __VLS_components.DataTable} */
    DataTable;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35({
        value: (__VLS_ctx.report.topCustomers),
        paginator: true,
        rows: (5),
        stripedRows: true,
    }));
    const __VLS_37 = __VLS_36({
        value: (__VLS_ctx.report.topCustomers),
        paginator: true,
        rows: (5),
        stripedRows: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    const { default: __VLS_40 } = __VLS_38.slots;
    let __VLS_41;
    /** @ts-ignore @type { | typeof __VLS_components.Column} */
    Column;
    // @ts-ignore
    const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({
        field: "customerName",
        header: "Khách hàng",
    }));
    const __VLS_43 = __VLS_42({
        field: "customerName",
        header: "Khách hàng",
    }, ...__VLS_functionalComponentArgsRest(__VLS_42));
    let __VLS_46;
    /** @ts-ignore @type { | typeof __VLS_components.Column} */
    Column;
    // @ts-ignore
    const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({
        field: "orderCount",
        header: "Số đơn",
    }));
    const __VLS_48 = __VLS_47({
        field: "orderCount",
        header: "Số đơn",
    }, ...__VLS_functionalComponentArgsRest(__VLS_47));
    let __VLS_51;
    /** @ts-ignore @type { | typeof __VLS_components.Column | typeof __VLS_components.Column} */
    Column;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({
        header: "Doanh thu",
    }));
    const __VLS_53 = __VLS_52({
        header: "Doanh thu",
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    const { default: __VLS_56 } = __VLS_54.slots;
    {
        const { body: __VLS_57 } = __VLS_54.slots;
        const [{ data }] = __VLS_vSlot(__VLS_57);
        (__VLS_ctx.formatCurrency(data.revenue));
        // @ts-ignore
        [report, formatCurrency,];
    }
    // @ts-ignore
    [];
    var __VLS_54;
    let __VLS_58;
    /** @ts-ignore @type { | typeof __VLS_components.Column | typeof __VLS_components.Column} */
    Column;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent1(__VLS_58, new __VLS_58({
        header: "Công nợ",
    }));
    const __VLS_60 = __VLS_59({
        header: "Công nợ",
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    const { default: __VLS_63 } = __VLS_61.slots;
    {
        const { body: __VLS_64 } = __VLS_61.slots;
        const [{ data }] = __VLS_vSlot(__VLS_64);
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: { warning: data.debt > 0 } }));
        /** @type {__VLS_StyleScopedClasses['warning']} */ ;
        (__VLS_ctx.formatCurrency(data.debt));
        // @ts-ignore
        [formatCurrency,];
    }
    // @ts-ignore
    [];
    var __VLS_61;
    // @ts-ignore
    [];
    var __VLS_38;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
