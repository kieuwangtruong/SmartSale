import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import Button from 'primevue/button';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { getRoleLabel } from '../services/apiClient';
import { useAuthStore } from '../stores/authStore';
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const sidebarOpen = ref(false);
const allNavigation = [
    { to: '/dashboard', label: 'Tổng quan', icon: 'pi pi-chart-bar', roles: ['Admin'] },
    { to: '/orders', label: 'Đơn hàng', icon: 'pi pi-shopping-cart', roles: ['Admin', 'SalesStaff'] },
    { to: '/customers', label: 'Khách hàng', icon: 'pi pi-users', roles: ['Admin', 'SalesStaff'] },
    { to: '/suppliers', label: 'Nhà cung cấp', icon: 'pi pi-truck', roles: ['Admin', 'WarehouseKeeper'] },
    { to: '/products', label: 'Sản phẩm', icon: 'pi pi-box', roles: ['Admin', 'WarehouseKeeper'] },
    { to: '/inventory', label: 'Kho hàng', icon: 'pi pi-warehouse', roles: ['Admin', 'WarehouseKeeper'] },
    { to: '/users', label: 'Tài khoản', icon: 'pi pi-user-edit', roles: ['Admin'] },
];
const navigation = computed(() => allNavigation.filter((item) => auth.role && item.roles.includes(auth.role)));
const currentPage = computed(() => navigation.value.find((item) => item.to === route.path)?.label ?? 'Quản lý');
const roleLabel = computed(() => getRoleLabel(auth.role));
async function handleLogout() {
    await auth.logout();
    await router.replace('/admin');
}
function syncAuth() {
    auth.sync();
}
const isDark = ref(false);
function toggleDarkMode() {
    isDark.value = !isDark.value;
    if (isDark.value) {
        document.documentElement.classList.add('app-dark');
        localStorage.setItem('theme-dark', 'true');
    }
    else {
        document.documentElement.classList.remove('app-dark');
        localStorage.setItem('theme-dark', 'false');
    }
}
onMounted(() => {
    window.addEventListener('auth-changed', syncAuth);
    isDark.value = localStorage.getItem('theme-dark') === 'true';
    if (isDark.value) {
        document.documentElement.classList.add('app-dark');
    }
    else {
        document.documentElement.classList.remove('app-dark');
    }
});
onUnmounted(() => window.removeEventListener('auth-changed', syncAuth));
const __VLS_ctx = (({}));
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'admin-shell' }));
/** @type {__VLS_StyleScopedClasses['admin-shell']} */ ;
if (__VLS_ctx.sidebarOpen) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.button)((({
	onClick: (...[$event]) => {
		if (!__VLS_ctx.sidebarOpen) return;
		__VLS_ctx.sidebarOpen = false;
		[sidebarOpen, sidebarOpen];
	},
	class: 'sidebar-backdrop',
	type: 'button',
	'aria-label': 'Đóng menu'
})));
    /** @type {__VLS_StyleScopedClasses['sidebar-backdrop']} */ ;
}
__VLS_asFunctionalElement1(__VLS_intrinsics.aside, __VLS_intrinsics.aside)((({
	class: 'admin-sidebar',
	class: { open: __VLS_ctx.sidebarOpen }
})));
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['open']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0(({
	class: 'admin-brand',
	to: '/'
})));
const __VLS_2 = __VLS_1(({
	class: 'admin-brand',
	to: '/'
}), ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['admin-brand']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'admin-brand-mark' }));
/** @type {__VLS_StyleScopedClasses['admin-brand-mark']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shopping-bag' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shopping-bag']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
// @ts-ignore
[sidebarOpen,];
var __VLS_3;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'nav-caption' }));
/** @type {__VLS_StyleScopedClasses['nav-caption']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.nav, __VLS_intrinsics.nav)(({ class: 'admin-navigation' }));
/** @type {__VLS_StyleScopedClasses['admin-navigation']} */ ;
for (const [item] of __VLS_vFor((__VLS_ctx.navigation))) {
    let __VLS_6;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6(({
	'onClick': {},
	key: item.to,
	to: item.to
})));
    const __VLS_8 = __VLS_7(({
	'onClick': {},
	key: item.to,
	to: item.to
}), ...__VLS_functionalComponentArgsRest(__VLS_7));
    let __VLS_11;
    const __VLS_12 = {
        /** @type {typeof __VLS_11.click} */
        onClick: (...[$event]) => {
            __VLS_ctx.sidebarOpen = false;
            // @ts-ignore
            [sidebarOpen, navigation,];
        },
    };
    const { default: __VLS_13 } = __VLS_9.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: item.icon }));
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    (item.label);
    // @ts-ignore
    [];
    var __VLS_9;
    var __VLS_10;
    // @ts-ignore
    [];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'admin-profile' }));
/** @type {__VLS_StyleScopedClasses['admin-profile']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'profile-avatar' }));
/** @type {__VLS_StyleScopedClasses['profile-avatar']} */ ;
(__VLS_ctx.auth.user?.fullName?.charAt(0).toUpperCase());
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.auth.user?.fullName);
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
(__VLS_ctx.roleLabel);
let __VLS_14;
/** @ts-ignore @type { | typeof __VLS_components.Button} */
Button;
// @ts-ignore
const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14(({
	'onClick': {},
	icon: 'pi pi-sign-out',
	severity: 'danger',
	text: true,
	rounded: true,
	'aria-label': 'Đăng xuất'
})));
const __VLS_16 = __VLS_15(({
	'onClick': {},
	icon: 'pi pi-sign-out',
	severity: 'danger',
	text: true,
	rounded: true,
	'aria-label': 'Đăng xuất'
}), ...__VLS_functionalComponentArgsRest(__VLS_15));
let __VLS_19;
const __VLS_20 = {
    /** @type {typeof __VLS_19.click} */
    onClick: (__VLS_ctx.handleLogout),
};
var __VLS_17;
var __VLS_18;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'admin-content' }));
/** @type {__VLS_StyleScopedClasses['admin-content']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.header, __VLS_intrinsics.header)(({ class: 'admin-topbar' }));
/** @type {__VLS_StyleScopedClasses['admin-topbar']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'topbar-title' }));
/** @type {__VLS_StyleScopedClasses['topbar-title']} */ ;
let __VLS_21;
/** @ts-ignore @type { | typeof __VLS_components.Button} */
Button;
// @ts-ignore
const __VLS_22 = __VLS_asFunctionalComponent1(__VLS_21, new __VLS_21((({
	'onClick': {},
	class: 'menu-toggle',
	icon: 'pi pi-bars',
	severity: 'secondary',
	text: true,
	rounded: true,
	'aria-label': 'Mở menu'
}))));
const __VLS_23 = __VLS_22((({
	'onClick': {},
	class: 'menu-toggle',
	icon: 'pi pi-bars',
	severity: 'secondary',
	text: true,
	rounded: true,
	'aria-label': 'Mở menu'
})), ...__VLS_functionalComponentArgsRest(__VLS_22));
let __VLS_26;
const __VLS_27 = {
    /** @type {typeof __VLS_26.click} */
    onClick: (...[$event]) => {
        __VLS_ctx.sidebarOpen = true;
        // @ts-ignore
        [sidebarOpen, auth, auth, roleLabel, handleLogout,];
    },
};
/** @type {__VLS_StyleScopedClasses['menu-toggle']} */ ;
var __VLS_24;
var __VLS_25;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
(__VLS_ctx.currentPage);
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'topbar-actions' }));
/** @type {__VLS_StyleScopedClasses['topbar-actions']} */ ;
let __VLS_28;
/** @ts-ignore @type { | typeof __VLS_components.Button} */
Button;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent1(__VLS_28, new __VLS_28(({
	'onClick': {},
	icon: __VLS_ctx.isDark ? 'pi pi-sun' : 'pi pi-moon',
	severity: 'secondary',
	text: true,
	rounded: true,
	'aria-label': 'Đổi giao diện'
})));
const __VLS_30 = __VLS_29(({
	'onClick': {},
	icon: __VLS_ctx.isDark ? 'pi pi-sun' : 'pi pi-moon',
	severity: 'secondary',
	text: true,
	rounded: true,
	'aria-label': 'Đổi giao diện'
}), ...__VLS_functionalComponentArgsRest(__VLS_29));
let __VLS_33;
const __VLS_34 = {
    /** @type {typeof __VLS_33.click} */
    onClick: (__VLS_ctx.toggleDarkMode),
};
var __VLS_31;
var __VLS_32;
let __VLS_35;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_36 = __VLS_asFunctionalComponent1(__VLS_35, new __VLS_35(({
	class: 'store-shortcut',
	to: '/'
})));
const __VLS_37 = __VLS_36(({
	class: 'store-shortcut',
	to: '/'
}), ...__VLS_functionalComponentArgsRest(__VLS_36));
/** @type {__VLS_StyleScopedClasses['store-shortcut']} */ ;
const { default: __VLS_40 } = __VLS_38.slots;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-external-link' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-external-link']} */ ;
// @ts-ignore
[currentPage, isDark, toggleDarkMode,];
var __VLS_38;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'role-chip' }));
/** @type {__VLS_StyleScopedClasses['role-chip']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-shield' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-shield']} */ ;
(__VLS_ctx.roleLabel);
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)(({ class: 'admin-main' }));
/** @type {__VLS_StyleScopedClasses['admin-main']} */ ;
let __VLS_41;
/** @ts-ignore @type { | typeof __VLS_components.RouterView} */
RouterView;
// @ts-ignore
const __VLS_42 = __VLS_asFunctionalComponent1(__VLS_41, new __VLS_41({}));
const __VLS_43 = __VLS_42({}, ...__VLS_functionalComponentArgsRest(__VLS_42));
let __VLS_46;
/** @ts-ignore @type { | typeof __VLS_components.Toast} */
Toast;
// @ts-ignore
const __VLS_47 = __VLS_asFunctionalComponent1(__VLS_46, new __VLS_46({}));
const __VLS_48 = __VLS_47({}, ...__VLS_functionalComponentArgsRest(__VLS_47));
let __VLS_51;
/** @ts-ignore @type { | typeof __VLS_components.ConfirmDialog} */
ConfirmDialog;
// @ts-ignore
const __VLS_52 = __VLS_asFunctionalComponent1(__VLS_51, new __VLS_51({}));
const __VLS_53 = __VLS_52({}, ...__VLS_functionalComponentArgsRest(__VLS_52));
// @ts-ignore
[roleLabel,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
