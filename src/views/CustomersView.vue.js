import { computed, onMounted, reactive, ref, watch } from 'vue';
import { createCustomer, deleteCustomer, formatCurrency, getCustomers, getGenderLabel, GENDER_OPTIONS, updateCustomer } from '../services/orderApi';
import { useAuthStore } from '../stores/authStore';
const auth = useAuthStore();
const customers = ref([]);
const editingId = ref(null);
const error = ref('');
const form = reactive({ fullName: '', phone: '', email: '', address: '', gender: 0, cccd: '', age: null });
const search = ref('');
const showForm = ref(false);
// Pagination state
const currentPage = ref(1);
const itemsPerPage = 10;
// Filter logic
const filtered = computed(() => {
    const q = search.value.toLowerCase().trim();
    return !q ? customers.value : customers.value.filter((c) => [c.fullName, c.phone, c.email, c.address].some((val) => val && val.toLowerCase().includes(q)));
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
    showForm.value = false;
    Object.assign(form, { fullName: '', phone: '', email: '', address: '', gender: 0, cccd: '', age: null });
}
async function load() {
    try {
        customers.value = await getCustomers();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể tải khách hàng.';
    }
}
function edit(item) {
    editingId.value = item.id;
    Object.assign(form, {
        fullName: item.fullName,
        phone: item.phone,
        email: item.email || '',
        address: item.address || '',
        gender: item.gender ?? 0,
        cccd: item.cccd || '',
        age: item.age ?? null,
    });
    showForm.value = true;
}
async function save() {
    try {
        if (editingId.value) {
            const current = customers.value.find((x) => x.id === editingId.value);
            await updateCustomer({ ...current, ...form });
        }
        else
            await createCustomer(form);
        reset();
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể lưu khách hàng.';
    }
}
async function remove(item) {
    if (!confirm(`Xóa khách hàng ${item.fullName}?`))
        return;
    try {
        await deleteCustomer(item.id);
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể xóa.';
    }
}
onMounted(load);
const __VLS_ctx = {
    ...{},
    ...{},
};
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
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "page" },
});
/** @type {__VLS_StyleScopedClasses['page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-head" },
});
/** @type {__VLS_StyleScopedClasses['page-head']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "page-head-actions" },
});
/** @type {__VLS_StyleScopedClasses['page-head-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.input)({
    placeholder: "Tìm khách hàng...",
    ...{ class: "search-input" },
});
(__VLS_ctx.search);
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.showForm = true;
            // @ts-ignore
            [search, showForm,];
        } },
    type: "button",
    ...{ class: "primary" },
});
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)({
    ...{ class: "pi pi-plus" },
});
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-plus']} */ ;
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "alert error" },
    });
    /** @type {__VLS_StyleScopedClasses['alert']} */ ;
    /** @type {__VLS_StyleScopedClasses['error']} */ ;
    (__VLS_ctx.error);
}
if (__VLS_ctx.showForm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div)({
        ...{ onClick: (__VLS_ctx.reset) },
        ...{ class: "modal-backdrop" },
    });
    /** @type {__VLS_StyleScopedClasses['modal-backdrop']} */ ;
}
if (__VLS_ctx.showForm) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)({
        ...{ class: "admin-modal" },
        'aria-label': "Biểu mẫu khách hàng",
    });
    /** @type {__VLS_StyleScopedClasses['admin-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "modal-head" },
    });
    /** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.editingId ? 'Cập nhật khách hàng' : 'Thêm khách hàng');
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.reset) },
        type: "button",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)({
        ...{ class: "pi pi-times" },
    });
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-times']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
        ...{ onSubmit: (__VLS_ctx.save) },
        ...{ class: "form admin-modal-body" },
    });
    /** @type {__VLS_StyleScopedClasses['form']} */ ;
    /** @type {__VLS_StyleScopedClasses['admin-modal-body']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        required: true,
    });
    (__VLS_ctx.form.fullName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        required: true,
    });
    (__VLS_ctx.form.phone);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "email",
    });
    (__VLS_ctx.form.email);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({});
    (__VLS_ctx.form.address);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.form.gender),
    });
    for (const [g] of __VLS_vFor((__VLS_ctx.GENDER_OPTIONS))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (g.value),
            value: (g.value),
        });
        (g.label);
        // @ts-ignore
        [showForm, showForm, error, error, reset, reset, editingId, save, form, form, form, form, form, GENDER_OPTIONS,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        placeholder: "Số CCCD/CMND",
    });
    (__VLS_ctx.form.cccd);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "number",
        min: "0",
        max: "150",
    });
    (__VLS_ctx.form.age);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "actions" },
    });
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ class: "primary" },
    });
    /** @type {__VLS_StyleScopedClasses['primary']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.reset) },
        type: "button",
    });
}
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "panel table-wrap" },
});
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
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
for (const [item] of __VLS_vFor((__VLS_ctx.visible))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
        key: (item.id),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.fullName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (item.address);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.phone);
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (item.email);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (__VLS_ctx.getGenderLabel(item.gender));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.cccd || '—');
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.age ?? '—');
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (item.orderCount);
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (__VLS_ctx.formatCurrency(item.totalSpent));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
    (__VLS_ctx.formatCurrency(item.currentDebt));
    __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
        ...{ class: "actions" },
    });
    /** @type {__VLS_StyleScopedClasses['actions']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.edit(item);
                // @ts-ignore
                [reset, form, form, visible, getGenderLabel, formatCurrency, formatCurrency, edit,];
            } },
    });
    if (__VLS_ctx.auth.role === 'Admin') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.auth.role === 'Admin'))
                        return;
                    __VLS_ctx.remove(item);
                    // @ts-ignore
                    [auth, remove,];
                } },
            ...{ class: "danger" },
        });
        /** @type {__VLS_StyleScopedClasses['danger']} */ ;
    }
    // @ts-ignore
    [];
}
if (__VLS_ctx.totalPages > 1) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pagination-footer" },
    });
    /** @type {__VLS_StyleScopedClasses['pagination-footer']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "pagination-info" },
    });
    /** @type {__VLS_StyleScopedClasses['pagination-info']} */ ;
    (__VLS_ctx.paginationInfo);
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "pagination-controls" },
    });
    /** @type {__VLS_StyleScopedClasses['pagination-controls']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.totalPages > 1))
                    return;
                __VLS_ctx.currentPage = 1;
                // @ts-ignore
                [totalPages, paginationInfo, currentPage,];
            } },
        type: "button",
        disabled: (__VLS_ctx.currentPage === 1),
        'aria-label': "Về đầu",
        title: "Về đầu",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)({
        ...{ class: "pi pi-chevron-double-left" },
    });
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-double-left']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.totalPages > 1))
                    return;
                __VLS_ctx.currentPage--;
                // @ts-ignore
                [currentPage, currentPage,];
            } },
        type: "button",
        disabled: (__VLS_ctx.currentPage === 1),
        'aria-label': "Trang trước",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)({
        ...{ class: "pi pi-chevron-left" },
    });
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-left']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "page-indicator" },
    });
    /** @type {__VLS_StyleScopedClasses['page-indicator']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
    (__VLS_ctx.currentPage);
    (__VLS_ctx.totalPages);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.totalPages > 1))
                    return;
                __VLS_ctx.currentPage++;
                // @ts-ignore
                [totalPages, currentPage, currentPage, currentPage,];
            } },
        type: "button",
        disabled: (__VLS_ctx.currentPage === __VLS_ctx.totalPages),
        'aria-label': "Trang sau",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)({
        ...{ class: "pi pi-chevron-right" },
    });
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-right']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.totalPages > 1))
                    return;
                __VLS_ctx.currentPage = __VLS_ctx.totalPages;
                // @ts-ignore
                [totalPages, totalPages, currentPage, currentPage,];
            } },
        type: "button",
        disabled: (__VLS_ctx.currentPage === __VLS_ctx.totalPages),
        'aria-label': "Về cuối",
        title: "Về cuối",
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)({
        ...{ class: "pi pi-chevron-double-right" },
    });
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-chevron-double-right']} */ ;
}
// @ts-ignore
[totalPages, currentPage,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
