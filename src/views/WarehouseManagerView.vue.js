import { computed, onMounted, reactive, ref, watch } from 'vue';
import { formatCurrency, getSuppliers } from '../services/orderApi';
import { cancelStockReceipt, confirmStockReceipt, createStockReceipt, getLowStock, getProducts, getStockReceipts, updateInventory, } from '../services/productApi';
const products = ref([]);
const suppliers = ref([]);
const receipts = ref([]);
const lowStock = ref([]);
const error = ref('');
const inventoryDraft = reactive({});
const receipt = reactive({
    supplierId: 0,
    note: '',
    items: [{ productId: 0, quantity: 1, importPrice: 0 }],
});
const search = ref('');
const showReceiptForm = ref(false);
// Pagination state
const currentPage = ref(1);
const itemsPerPage = 10;
const inventoryValue = computed(() => products.value.reduce((sum, p) => sum + p.importPrice * p.quantity, 0));
const filteredProducts = computed(() => {
    const q = search.value.toLowerCase().trim();
    return !q ? products.value : products.value.filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q));
});
// Pagination calculations
const totalPages = computed(() => {
    return Math.ceil(filteredProducts.value.length / itemsPerPage) || 1;
});
const visibleProducts = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredProducts.value.slice(start, start + itemsPerPage);
});
// Status display
const paginationInfo = computed(() => {
    const total = filteredProducts.value.length;
    if (total === 0)
        return '';
    const start = (currentPage.value - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage.value * itemsPerPage, total);
    return `Hiển thị ${start}-${end} trong tổng số ${total} mục`;
});
// Reset to page 1 when search changes
watch(search, () => {
    currentPage.value = 1;
});
function resetReceipt() {
    showReceiptForm.value = false;
    Object.assign(receipt, { supplierId: 0, note: '', items: [{ productId: 0, quantity: 1, importPrice: 0 }] });
}
async function load() {
    error.value = '';
    try {
        ;
        [products.value, suppliers.value, receipts.value, lowStock.value] = await Promise.all([
            getProducts(), getSuppliers(), getStockReceipts(), getLowStock(),
        ]);
        for (const p of products.value) {
            inventoryDraft[p.id] = { quantity: p.quantity, reserveStock: p.reserveStock };
        }
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể tải dữ liệu kho.';
    }
}
async function saveInventory(product) {
    const draft = inventoryDraft[product.id];
    if (!draft)
        return;
    try {
        await updateInventory(product.id, product.quantity, draft.reserveStock);
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể cập nhật ngưỡng tồn.';
    }
}
function addReceiptItem() { receipt.items.push({ productId: 0, quantity: 1, importPrice: 0 }); }
function removeReceiptItem(index) { if (receipt.items.length > 1)
    receipt.items.splice(index, 1); }
async function submitReceipt() {
    const items = receipt.items.filter((x) => x.productId && x.quantity > 0);
    if (!receipt.supplierId || !items.length) {
        error.value = 'Chọn nhà cung cấp và sản phẩm nhập.';
        return;
    }
    try {
        await createStockReceipt({ supplierId: receipt.supplierId, note: receipt.note, items });
        resetReceipt();
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể tạo phiếu nhập.';
    }
}
async function confirmReceipt(item) {
    try {
        await confirmStockReceipt(item.id);
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể xác nhận phiếu.';
    }
}
async function cancelReceipt(item) {
    try {
        await cancelStockReceipt(item.id);
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể hủy phiếu.';
    }
}
onMounted(load);
const __VLS_ctx = (({}));
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['receipt-item']} */ ;
/** @type {__VLS_StyleScopedClasses['receipt-item']} */ ;
/** @type {__VLS_StyleScopedClasses['receipt-item']} */ ;
/** @type {__VLS_StyleScopedClasses['add-row-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['stock-readonly']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-info']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['page-indicator']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({ class: 'page' }));
/** @type {__VLS_StyleScopedClasses['page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'page-head' }));
/** @type {__VLS_StyleScopedClasses['page-head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'page-head-actions' }));
/** @type {__VLS_StyleScopedClasses['page-head-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)(({
	placeholder: 'Tìm sản phẩm tồn kho...',
	class: 'search-input'
}));
(__VLS_ctx.search);
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		__VLS_ctx.showReceiptForm = true;
		[search, showReceiptForm];
	},
	type: 'button',
	class: 'primary'
})));
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-plus' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'alert error' }));
    /** @type {__VLS_StyleScopedClasses['alert']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'stats' }));
/** @type {__VLS_StyleScopedClasses['stats']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.products.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.lowStock.length);
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.formatCurrency(__VLS_ctx.inventoryValue));
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.receipts.length);
if (__VLS_ctx.showReceiptForm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)((({
	onClick: __VLS_ctx.resetReceipt,
	class: 'modal-backdrop'
})));
    /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
}
if (__VLS_ctx.showReceiptForm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)(({
	class: 'admin-modal',
	'aria-label': 'Tạo phiếu nhập kho'
}));
    /** @type {__VLS_StyleScopedClasses['admin-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'modal-head' }));
    /** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.resetReceipt,
	type: 'button'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)((({
	onSubmit: __VLS_ctx.submitReceipt,
	class: 'form admin-modal-body'
})));
    /** @type {__VLS_StyleScopedClasses['form']} */ ;
    /** @type {__VLS_StyleScopedClasses['admin-modal-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.receipt.supplierId),
        required: true,
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (0),
    });
    for (const [s] of __VLS_vFor((__VLS_ctx.suppliers))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (s.id),
            value: (s.id),
        });
        (s.name);
        // @ts-ignore
        [showReceiptForm, showReceiptForm, error, error, products, lowStock, formatCurrency, inventoryValue, receipts, resetReceipt, resetReceipt, submitReceipt, receipt, suppliers,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({});
    (__VLS_ctx.receipt.note);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'form-section-title' }));
    /** @type {__VLS_StyleScopedClasses['form-section-title']} */ ;
    for (const [item, index] of __VLS_vFor((__VLS_ctx.receipt.items))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({
	key: index,
	class: 'receipt-item'
}));
        /** @type {__VLS_StyleScopedClasses['receipt-item']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
            value: (item.productId),
            required: true,
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            value: (0),
        });
        for (const [p] of __VLS_vFor((__VLS_ctx.products))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                key: (p.id),
                value: (p.id),
            });
            (p.name);
            // @ts-ignore
            [products, receipt, receipt,];
        }
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "number",
            min: "1",
            placeholder: "SL",
        });
        (item.quantity);
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "number",
            min: "0",
            placeholder: "Giá nhập",
        });
        (item.importPrice);
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.showReceiptForm) return;
		__VLS_ctx.removeReceiptItem(index);
		[removeReceiptItem];
	},
	type: 'button',
	class: 'danger'
})));
        /** @type {__VLS_StyleScopedClasses['danger']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-trash' }));
        /** @type {__VLS_StyleScopedClasses['pi']} */ ;
        /** @type {__VLS_StyleScopedClasses['pi-trash']} */ ;
        // @ts-ignore
        [];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: __VLS_ctx.addReceiptItem,
	type: 'button',
	class: 'add-row-btn'
})));
    /** @type {__VLS_StyleScopedClasses['add-row-btn']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-plus' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'actions' }));
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({ class: 'primary' }));
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.resetReceipt,
	type: 'button'
}));
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'full-width-tables-container' }));
/** @type {__VLS_StyleScopedClasses['full-width-tables-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(({ class: 'panel table-wrap' }));
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)(({ style: {} }));
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)(({ style: {} }));
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)(({ style: {} }));
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [p] of __VLS_vFor((__VLS_ctx.visibleProducts))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (p.id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (p.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (p.id);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'stock-readonly' }));
    /** @type {__VLS_StyleScopedClasses['stock-readonly']} */ ;
    (p.quantity);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    if (__VLS_ctx.inventoryDraft[p.id]) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)(({
	type: 'number',
	min: '0',
	class: 'table-number-input'
}));
        (__VLS_ctx.inventoryDraft[p.id].reserveStock);
        /** @type {__VLS_StyleScopedClasses['table-number-input']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		__VLS_ctx.saveInventory(p);
		[
			resetReceipt,
			addReceiptItem,
			visibleProducts,
			inventoryDraft,
			inventoryDraft,
			saveInventory
		];
	},
	class: 'primary table-save-btn'
})));
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    /** @type {__VLS_StyleScopedClasses['table-save-btn']} */ ;
    // @ts-ignore
    [];
}
if (__VLS_ctx.totalPages > 1) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'pagination-footer' }));
    /** @type {__VLS_StyleScopedClasses['pagination-footer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'pagination-info' }));
    /** @type {__VLS_StyleScopedClasses['pagination-info']} */ ;
    (__VLS_ctx.paginationInfo);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'pagination-controls' }));
    /** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!(__VLS_ctx.totalPages > 1)) return;
		__VLS_ctx.currentPage = 1;
		[
			totalPages,
			paginationInfo,
			currentPage
		];
	},
	type: 'button',
	disabled: __VLS_ctx.currentPage === 1,
	'aria-label': 'Về đầu',
	title: 'Về đầu'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-chevron-double-left' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-double-left']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!(__VLS_ctx.totalPages > 1)) return;
		__VLS_ctx.currentPage--;
		[currentPage, currentPage];
	},
	type: 'button',
	disabled: __VLS_ctx.currentPage === 1,
	'aria-label': 'Trang trước'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-chevron-left' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-left']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'page-indicator' }));
    /** @type {__VLS_StyleScopedClasses['page-indicator']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.currentPage);
    (__VLS_ctx.totalPages);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!(__VLS_ctx.totalPages > 1)) return;
		__VLS_ctx.currentPage++;
		[
			totalPages,
			currentPage,
			currentPage,
			currentPage
		];
	},
	type: 'button',
	disabled: __VLS_ctx.currentPage === __VLS_ctx.totalPages,
	'aria-label': 'Trang sau'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-chevron-right' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-right']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: (...[$event]) => {
		if (!(__VLS_ctx.totalPages > 1)) return;
		__VLS_ctx.currentPage = __VLS_ctx.totalPages;
		[
			totalPages,
			totalPages,
			currentPage,
			currentPage
		];
	},
	type: 'button',
	disabled: __VLS_ctx.currentPage === __VLS_ctx.totalPages,
	'aria-label': 'Về cuối',
	title: 'Về cuối'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-chevron-double-right' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-double-right']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)((({
	class: 'panel table-wrap',
	style: {}
})));
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h3, __VLS_intrinsics.h3)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [item] of __VLS_vFor((__VLS_ctx.receipts))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (item.id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.id);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (new Date(item.createdAt).toLocaleString('vi-VN'));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.supplierName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.items.map((x) => `${x.productName} x${x.quantity}`).join(', '));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.status);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)(({ class: 'actions' }));
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    if (item.status === 'Draft') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!(item.status === 'Draft')) return;
		__VLS_ctx.confirmReceipt(item);
		[
			receipts,
			totalPages,
			currentPage,
			confirmReceipt
		];
	},
	class: 'primary'
})));
        /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    }
    if (item.status === 'Draft') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!(item.status === 'Draft')) return;
		__VLS_ctx.cancelReceipt(item);
		[cancelReceipt];
	},
	class: 'danger'
})));
        /** @type {__VLS_StyleScopedClasses['danger']} */ ;
    }
    // @ts-ignore
    [];
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
