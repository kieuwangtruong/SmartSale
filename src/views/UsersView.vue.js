import { computed, onMounted, reactive, ref, watch } from 'vue';
import { createUser, deleteUser, getUsers, updateUser, } from '../services/userApi';
import { getRoleLabel, USER_ROLES } from '../services/apiClient';
const users = ref([]);
const loading = ref(false);
const error = ref('');
const editingId = ref(null);
const form = reactive({
    userName: '',
    fullName: '',
    email: '',
    passwordHash: '',
    dateOfBirth: '2000-01-01',
    role: 'SalesStaff',
    sex: 0,
    address: '',
});
const search = ref('');
const showForm = ref(false);
// Pagination state
const currentPage = ref(1);
const itemsPerPage = 10;
// Filter logic
const filtered = computed(() => {
    const q = search.value.toLowerCase().trim();
    return !q ? users.value : users.value.filter((u) => [u.userName, u.fullName, u.email].some((val) => val && val.toLowerCase().includes(q)));
});
// Pagination calculations
const totalPages = computed(() => {
    return Math.ceil(filtered.value.length / itemsPerPage) || 1;
});
const visible = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filtered.value.slice(start, start + itemsPerPage);
});
const editingUser = computed(() => editingId.value ? users.value.find((u) => u.id === editingId.value) ?? null : null);
const isEditingAdmin = computed(() => editingUser.value?.role === 'Admin');
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
    Object.assign(form, {
        userName: '', fullName: '', email: '', passwordHash: '',
        dateOfBirth: '2000-01-01', role: 'SalesStaff', sex: 0, address: '',
    });
}
async function load() {
    loading.value = true;
    error.value = '';
    try {
        users.value = await getUsers();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể tải tài khoản.';
    }
    finally {
        loading.value = false;
    }
}
function edit(user) {
    editingId.value = user.id;
    Object.assign(form, {
        userName: user.userName, fullName: user.fullName, email: user.email,
        passwordHash: '', dateOfBirth: user.dateOfBirth.slice(0, 10),
        role: user.role, sex: user.sex, address: user.address,
    });
    showForm.value = true;
}
async function save() {
    error.value = '';
    try {
        if (editingId.value) {
            const { passwordHash, ...values } = form;
            const payload = {
                id: editingId.value,
                ...values,
                ...(passwordHash && !isEditingAdmin.value ? { passwordHash } : {}),
            };
            await updateUser(payload);
        }
        else {
            await createUser(form);
        }
        reset();
        await load();
    }
    catch (e) {
        error.value = e instanceof Error ? e.message : 'Không thể lưu tài khoản.';
    }
}
async function remove(user) {
    if (!confirm(`Xóa tài khoản ${user.fullName}?`))
        return;
    try {
        await deleteUser(user.id);
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
/** @type {__VLS_StyleScopedClasses['role-label']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-password-note']} */ ;
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
    placeholder: "Tìm tài khoản...",
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
        'aria-label': "Biểu mẫu tài khoản",
    });
    /** @type {__VLS_StyleScopedClasses['admin-modal']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "modal-head" },
    });
    /** @type {__VLS_StyleScopedClasses['modal-head']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
    (__VLS_ctx.editingId ? 'Cập nhật tài khoản' : 'Tạo tài khoản');
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
    (__VLS_ctx.form.userName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        required: true,
    });
    (__VLS_ctx.form.fullName);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "email",
        required: true,
    });
    (__VLS_ctx.form.email);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    if (!__VLS_ctx.isEditingAdmin) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "password",
            required: (!__VLS_ctx.editingId),
        });
        (__VLS_ctx.form.passwordHash);
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
            type: "password",
            value: "********",
            disabled: true,
            title: "Không thể đổi mật khẩu tài khoản Admin",
        });
    }
    if (__VLS_ctx.isEditingAdmin) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
            ...{ class: "admin-password-note" },
        });
        /** @type {__VLS_StyleScopedClasses['admin-password-note']} */ ;
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        type: "date",
        required: true,
    });
    (__VLS_ctx.form.dateOfBirth);
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.form.role),
    });
    for (const [role] of __VLS_vFor((__VLS_ctx.USER_ROLES))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
            key: (role.value),
            value: (role.value),
        });
        (role.label);
        // @ts-ignore
        [showForm, showForm, error, error, reset, reset, editingId, editingId, save, form, form, form, form, form, form, isEditingAdmin, isEditingAdmin, USER_ROLES,];
    }
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
        value: (__VLS_ctx.form.sex),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (0),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (1),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
        value: (2),
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({});
    (__VLS_ctx.form.address);
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
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.table, __VLS_intrinsics.table)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.thead, __VLS_intrinsics.thead)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.th, __VLS_intrinsics.th)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.tbody, __VLS_intrinsics.tbody)({});
    for (const [user] of __VLS_vFor((__VLS_ctx.visible))) {
        __VLS_asFunctionalElement1(__VLS_intrinsics.tr, __VLS_intrinsics.tr)({
            key: (user.id),
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (user.fullName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
        (user.userName);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        (user.email);
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({});
        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
            ...{ class: "role-label" },
        });
        /** @type {__VLS_StyleScopedClasses['role-label']} */ ;
        (__VLS_ctx.getRoleLabel(user.role));
        __VLS_asFunctionalElement1(__VLS_intrinsics.td, __VLS_intrinsics.td)({
            ...{ class: "actions" },
        });
        /** @type {__VLS_StyleScopedClasses['actions']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.edit(user);
                    // @ts-ignore
                    [reset, form, form, loading, visible, getRoleLabel, edit,];
                } },
        });
        __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    __VLS_ctx.remove(user);
                    // @ts-ignore
                    [remove,];
                } },
            ...{ class: "danger" },
        });
        /** @type {__VLS_StyleScopedClasses['danger']} */ ;
        // @ts-ignore
        [];
    }
}
if (!__VLS_ctx.loading && __VLS_ctx.totalPages > 1) {
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
                if (!(!__VLS_ctx.loading && __VLS_ctx.totalPages > 1))
                    return;
                __VLS_ctx.currentPage = 1;
                // @ts-ignore
                [loading, totalPages, paginationInfo, currentPage,];
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
                if (!(!__VLS_ctx.loading && __VLS_ctx.totalPages > 1))
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
                if (!(!__VLS_ctx.loading && __VLS_ctx.totalPages > 1))
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
                if (!(!__VLS_ctx.loading && __VLS_ctx.totalPages > 1))
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
