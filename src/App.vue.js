import { computed, onMounted, onUnmounted } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import AdminLayout from './layouts/AdminLayout.vue';
import { useAuthStore } from './stores/authStore';
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const isPublicPage = computed(() => Boolean(route.meta.public));
function handleAuthChange() {
    auth.sync();
    if (!auth.isAuthenticated && !route.meta.public) {
        void router.replace({
            name: 'admin-login',
            query: { redirect: route.fullPath },
        });
    }
}
onMounted(() => window.addEventListener('auth-changed', handleAuthChange));
onUnmounted(() => window.removeEventListener('auth-changed', handleAuthChange));
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
if (__VLS_ctx.isPublicPage || !__VLS_ctx.auth.isAuthenticated) {
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RouterView} */
    RouterView;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({}));
    const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
    var __VLS_5;
    var __VLS_3;
}
else {
    const __VLS_6 = AdminLayout;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({}));
    const __VLS_8 = __VLS_7({}, ...__VLS_functionalComponentArgsRest(__VLS_7));
    var __VLS_11;
    var __VLS_9;
}
// @ts-ignore
[isPublicPage, auth,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
