import { computed, ref } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { homeForRole } from '../router';
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const activeRole = ref('Admin');
const rolesList = [
    {
        role: 'Admin',
        label: 'Quản trị viên',
        icon: 'pi pi-shield',
        defaultEmail: '',
        defaultPassword: ''
    },
    {
        role: 'SalesStaff',
        label: 'Nhân viên bán lẻ',
        icon: 'pi pi-users',
        defaultEmail: '',
        defaultPassword: ''
    },
    {
        role: 'WarehouseKeeper',
        label: 'Thủ kho quản lý',
        icon: 'pi pi-box',
        defaultEmail: '',
        defaultPassword: ''
    }
];
const roleBranding = computed(() => {
    if (activeRole.value === 'Admin') {
        return {
            title: 'Quản lý Hệ thống & Báo cáo',
            desc: 'Giám sát hoạt động kinh doanh toàn diện, xem doanh thu bán lẻ thời gian thực và quản lý nhân sự hiệu quả.',
            image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=800'
        };
    }
    if (activeRole.value === 'WarehouseKeeper') {
        return {
            title: 'Quản lý Kho & Nhập hàng',
            desc: 'Đồng bộ hóa tồn kho tự động, cập nhật danh mục sản phẩm và phê duyệt các phiếu nhập kho.',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800'
        };
    }
    return {
        title: 'Xử lý Đơn hàng & Bán hàng',
        desc: 'Thiết lập đơn hàng tức thì cho khách hàng, quản lý công nợ và thống kê lịch sử bán lẻ chi tiết.',
        image: 'https://static.topcv.vn/cms/nhan-vien-ban-hang-la-gi-topcv-1164b8fce1e09aa.jpg'
    };
});
function changeRole(role) {
    activeRole.value = role;
    const found = rolesList.find((r) => r.role === role);
    if (found) {
        email.value = found.defaultEmail;
        password.value = found.defaultPassword;
    }
}
async function submit() {
    if (!email.value.trim() || !password.value) {
        error.value = 'Vui lòng nhập email và mật khẩu.';
        return;
    }
    loading.value = true;
    error.value = '';
    try {
        const user = await auth.login(email.value.trim(), password.value);
        const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
        await router.replace(redirect || homeForRole(user.role));
    }
    catch (exception) {
        error.value = exception instanceof Error ? exception.message : 'Không thể đăng nhập.';
    }
    finally {
        loading.value = false;
    }
}
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['is-admin-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel-content']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel-content']} */ ;
/** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-area']} */ ;
/** @type {__VLS_StyleScopedClasses['form-container']} */ ;
/** @type {__VLS_StyleScopedClasses['role-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['role-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['role-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['input-group']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['store-link']} */ ;
/** @type {__VLS_StyleScopedClasses['login-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-area']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['form-container']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['role-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['role-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['role-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['input-group']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['p-inputtext']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
/** @type {__VLS_StyleScopedClasses['app-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['store-link']} */ ;
/** @type {__VLS_StyleScopedClasses['login-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['image-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "login-page" },
});
/** @type {__VLS_StyleScopedClasses['login-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "login-wrapper" },
    ...{ class: ({ 'is-admin-layout': __VLS_ctx.activeRole === 'Admin' }) },
});
/** @type {__VLS_StyleScopedClasses['login-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['is-admin-layout']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "image-panel" },
    ...{ style: ({ backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.7)), url(${__VLS_ctx.roleBranding.image})` }) },
});
/** @type {__VLS_StyleScopedClasses['image-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "image-panel-content" },
    key: (__VLS_ctx.activeRole),
});
/** @type {__VLS_StyleScopedClasses['image-panel-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "eyebrow" },
});
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
(__VLS_ctx.roleBranding.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
(__VLS_ctx.roleBranding.desc);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "brand-footer" },
});
/** @type {__VLS_StyleScopedClasses['brand-footer']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "form-panel" },
});
/** @type {__VLS_StyleScopedClasses['form-panel']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "form-container" },
});
/** @type {__VLS_StyleScopedClasses['form-container']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "logo-area" },
});
/** @type {__VLS_StyleScopedClasses['logo-area']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "brand-logo" },
});
/** @type {__VLS_StyleScopedClasses['brand-logo']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)({
    ...{ class: "pi pi-shopping-bag" },
});
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "role-selector" },
});
/** @type {__VLS_StyleScopedClasses['role-selector']} */ ;
for (const [r] of __VLS_vFor((__VLS_ctx.rolesList))) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.changeRole(r.role);
                // @ts-ignore
                [activeRole, activeRole, roleBranding, roleBranding, roleBranding, rolesList, changeRole,];
            } },
        key: (r.role),
        type: "button",
        ...{ class: "role-btn" },
        ...{ class: ({ active: __VLS_ctx.activeRole === r.role }) },
    });
    /** @type {__VLS_StyleScopedClasses['role-btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['active']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)({
        ...{ class: (r.icon) },
    });
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (r.label);
    // @ts-ignore
    [activeRole,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.form, __VLS_intrinsics.form)({
    ...{ onSubmit: (__VLS_ctx.submit) },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "input-group" },
});
/** @type {__VLS_StyleScopedClasses['input-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    for: "email",
});
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.InputText} */
InputText;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    id: "email",
    modelValue: (__VLS_ctx.email),
    type: "email",
    autocomplete: "email",
    placeholder: "admin@company.com",
    fluid: true,
}));
const __VLS_2 = __VLS_1({
    id: "email",
    modelValue: (__VLS_ctx.email),
    type: "email",
    autocomplete: "email",
    placeholder: "admin@company.com",
    fluid: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "input-group" },
});
/** @type {__VLS_StyleScopedClasses['input-group']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    for: "password",
});
let __VLS_5;
/** @ts-ignore @type { | typeof __VLS_components.Password} */
Password;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent1(__VLS_5, new __VLS_5({
    id: "password",
    modelValue: (__VLS_ctx.password),
    autocomplete: "current-password",
    placeholder: "Nhập mật khẩu",
    feedback: (false),
    toggleMask: true,
    fluid: true,
}));
const __VLS_7 = __VLS_6({
    id: "password",
    modelValue: (__VLS_ctx.password),
    autocomplete: "current-password",
    placeholder: "Nhập mật khẩu",
    feedback: (false),
    toggleMask: true,
    fluid: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "error-msg" },
    });
    /** @type {__VLS_StyleScopedClasses['error-msg']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)({
        ...{ class: "pi pi-exclamation-circle" },
    });
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-exclamation-circle']} */ ;
    (__VLS_ctx.error);
}
let __VLS_10;
/** @ts-ignore @type { | typeof __VLS_components.Button} */
Button;
// @ts-ignore
const __VLS_11 = __VLS_asFunctionalComponent1(__VLS_10, new __VLS_10({
    type: "submit",
    label: "Đăng nhập",
    icon: "pi pi-sign-in",
    loading: (__VLS_ctx.loading),
    fluid: true,
}));
const __VLS_12 = __VLS_11({
    type: "submit",
    label: "Đăng nhập",
    icon: "pi pi-sign-in",
    loading: (__VLS_ctx.loading),
    fluid: true,
}, ...__VLS_functionalComponentArgsRest(__VLS_11));
let __VLS_15;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent1(__VLS_15, new __VLS_15({
    ...{ class: "store-link" },
    to: "/",
}));
const __VLS_17 = __VLS_16({
    ...{ class: "store-link" },
    to: "/",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
/** @type {__VLS_StyleScopedClasses['store-link']} */ ;
const { default: __VLS_20 } = __VLS_18.slots;
// @ts-ignore
[submit, email, password, error, error, loading,];
var __VLS_18;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
