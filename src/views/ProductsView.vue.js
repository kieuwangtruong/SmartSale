import { computed, onMounted, reactive, ref, watch } from 'vue';
import { formatCurrency } from '../services/orderApi';
import { getSuppliers } from '../services/orderApi';
import { createCategory, createProduct, deleteProduct, getCategories, getProducts, updateProduct, } from '../services/productApi';
import { useAuthStore } from '../stores/authStore';
const auth = useAuthStore();
const canManageProducts = computed(() => auth.role === 'Admin' || auth.role === 'WarehouseKeeper');
const products = ref([]);
const categories = ref([]);
const suppliers = ref([]);
const search = ref('');
const error = ref('');
const editingId = ref(null);
const categoryName = ref('');
const form = reactive({
    name: '', importPrice: 0, sellingPrice: 0,
    imageUrl: '', categoryId: 0, quantity: 0, reserveStock: 0,
    supplierId: 0,
});
const showProductModal = ref(false);
const showCategoryModal = ref(false);
const showAddMenu = ref(false);
// Pagination state
const currentPage = ref(1);
const itemsPerPage = 10;
function toggleAddMenu() {
    showAddMenu.value = !showAddMenu.value;
}
function openAddProduct() {
    showAddMenu.value = false;
    reset();
    showProductModal.value = true;
}
function openAddCategory() {
    showAddMenu.value = false;
    categoryName.value = '';
    showCategoryModal.value = true;
}
// Filter logic
const filtered = computed(() => {
    const q = search.value.toLowerCase().trim();
    return !q ? products.value : products.value.filter((p) => [p.name, p.categoryName, String(p.id)].some((value) => value.toLowerCase().includes(q)));
});
// Pagination calculations
const totalPages = computed(() => {
    return Math.ceil(filtered.value.length / itemsPerPage) || 1;
});
const visible = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filtered.value.slice(start, start + itemsPerPage);
});
// Status display
const paginationInfo = computed(() => {
    const total = filtered.value.length;
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
function reset() {
    editingId.value = null;
    showProductModal.value = false;
    showCategoryModal.value = false;
    Object.assign(form, { name: '', importPrice: 0, sellingPrice: 0, imageUrl: '', categoryId: 0, supplierId: 0, quantity: 0, reserveStock: 0 });
}
async function load() {
    try {
        const requests = [
            getProducts(),
            getCategories(),
            canManageProducts.value ? getSuppliers() : Promise.resolve(null),
        ];
        const [productData, categoryData, supplierData] = await Promise.all(requests);
        products.value = productData;
        categories.value = categoryData;
        suppliers.value = supplierData ?? [];
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể tải sản phẩm.';
    }
}
function edit(p) {
    editingId.value = p.id;
    Object.assign(form, {
        name: p.name, importPrice: p.importPrice,
        sellingPrice: p.sellingPrice, imageUrl: p.imageUrl || '',
        categoryId: p.categoryId, supplierId: p.supplierId,
        quantity: p.quantity, reserveStock: p.reserveStock,
    });
    showProductModal.value = true;
}
async function save() {
    try {
        if (editingId.value)
            await updateProduct(editingId.value, form);
        else
            await createProduct(form);
        reset();
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể lưu sản phẩm.';
    }
}
async function addCategory() {
    if (!categoryName.value.trim())
        return;
    try {
        await createCategory({ name: categoryName.value.trim(), parentCategoryId: null });
        categoryName.value = '';
        showCategoryModal.value = false;
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể tạo danh mục.';
    }
}
async function remove(p) {
    if (!confirm(`Xóa sản phẩm ${p.name}?`))
        return;
    try {
        await deleteProduct(p.id);
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể xóa.';
    }
}
onMounted(load);
const __VLS_ctx = (({}));
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
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
	placeholder: 'Tìm sản phẩm...',
	class: 'search-input'
}));
(__VLS_ctx.search);
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
if (__VLS_ctx.canManageProducts) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'add-dropdown-container' }));
    /** @type {__VLS_StyleScopedClasses['add-dropdown-container']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: __VLS_ctx.toggleAddMenu,
	type: 'button',
	class: 'primary'
})));
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-plus' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-angle-down' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-angle-down']} */ ;
    if (__VLS_ctx.showAddMenu) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'add-dropdown-menu' }));
        /** @type {__VLS_StyleScopedClasses['add-dropdown-menu']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)(({
	onClick: __VLS_ctx.openAddProduct,
	href: '#'
}));
        __VLS_asFunctionalElement1(__VLS_intrinsics.a, __VLS_intrinsics.a)(({
	onClick: __VLS_ctx.openAddCategory,
	href: '#'
}));
    }
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'alert error' }));
    /** @type {__VLS_StyleScopedClasses['alert']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
if (__VLS_ctx.showProductModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)((({
	onClick: __VLS_ctx.reset,
	class: 'modal-backdrop'
})));
    /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
}
if (__VLS_ctx.showProductModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)(({
	class: 'admin-modal',
	'aria-label': 'Biểu mẫu sản phẩm'
}));
    /** @type {__VLS_StyleScopedClasses['admin-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'modal-head' }));
    /** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.editingId ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.reset,
	type: 'button'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)((({
	onSubmit: __VLS_ctx.save,
	class: 'form admin-modal-body'
})));
    /** @type {__VLS_StyleScopedClasses['form']} */ ;
    /** @type {__VLS_StyleScopedClasses['admin-modal-body']} */ ;
    if (__VLS_ctx.editingId) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            value: (__VLS_ctx.editingId),
            disabled: true,
        });
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        required: true,
    });
    (__VLS_ctx.form.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.form.categoryId),
        required: true,
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (0),
    });
    for (const [c] of __VLS_vFor((__VLS_ctx.categories))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (c.id),
            value: (c.id),
        });
        (c.name);
        // @ts-ignore
        [search, canManageProducts, toggleAddMenu, showAddMenu, openAddProduct, openAddCategory, error, error, showProductModal, showProductModal, reset, reset, editingId, editingId, editingId, save, form, form, categories,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.form.supplierId),
        required: true,
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (0),
    });
    for (const [supplier] of __VLS_vFor((__VLS_ctx.suppliers))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (supplier.id),
            value: (supplier.id),
        });
        (supplier.name);
        // @ts-ignore
        [form, suppliers,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.form.importPrice);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.form.sellingPrice);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.form.quantity);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "0",
    });
    (__VLS_ctx.form.reserveStock);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({});
    (__VLS_ctx.form.imageUrl);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'actions' }));
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({ class: 'primary' }));
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.reset,
	type: 'button'
}));
}
if (__VLS_ctx.showCategoryModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)((({
	onClick: __VLS_ctx.reset,
	class: 'modal-backdrop'
})));
    /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
}
if (__VLS_ctx.showCategoryModal) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)(({
	class: 'admin-modal',
	'aria-label': 'Biểu mẫu danh mục'
}));
    /** @type {__VLS_StyleScopedClasses['admin-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'modal-head' }));
    /** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.reset,
	type: 'button'
}));
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)((({
	onSubmit: __VLS_ctx.addCategory,
	class: 'form admin-modal-body'
})));
    /** @type {__VLS_StyleScopedClasses['form']} */ ;
    /** @type {__VLS_StyleScopedClasses['admin-modal-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        placeholder: "Danh mục mới",
        required: true,
    });
    (__VLS_ctx.categoryName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'actions' }));
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({ class: 'primary' }));
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({
	onClick: __VLS_ctx.reset,
	type: 'button'
}));
}
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)(({ class: 'panel table-wrap' }));
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [p] of __VLS_vFor((__VLS_ctx.visible))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (p.id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (p.name);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (p.id);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (p.categoryName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (p.supplierName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (__VLS_ctx.formatCurrency(p.sellingPrice));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: { warning: p.quantity <= p.reserveStock } }));
    /** @type {__VLS_StyleScopedClasses['warning']} */ ;
    (p.quantity);
    (p.reserveStock);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)(({ class: 'actions' }));
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    if (__VLS_ctx.canManageProducts) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)(({ onClick: (...[$event]) => {
	if (!__VLS_ctx.canManageProducts) return;
	__VLS_ctx.edit(p);
	[
		canManageProducts,
		reset,
		reset,
		reset,
		reset,
		form,
		form,
		form,
		form,
		form,
		showCategoryModal,
		showCategoryModal,
		addCategory,
		categoryName,
		visible,
		formatCurrency,
		edit
	];
} }));
    }
    if (__VLS_ctx.auth.role === 'Admin') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!(__VLS_ctx.auth.role === 'Admin')) return;
		__VLS_ctx.remove(p);
		[auth, remove];
	},
	class: 'danger'
})));
        /** @type {__VLS_StyleScopedClasses['danger']} */ ;
    }
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
// @ts-ignore
[totalPages, currentPage,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
