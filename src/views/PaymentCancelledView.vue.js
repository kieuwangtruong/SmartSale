import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { getPaymentStatus } from '../services/orderApi';
const route = useRoute();
const loading = ref(true);
const error = ref('');
const orderId = ref(null);
const orderCode = computed(() => String(route.query.orderCode ?? ''));
async function loadCancellation() {
    if (!orderCode.value) {
        error.value = 'Không tìm thấy mã thanh toán của đơn hàng.';
        loading.value = false;
        return;
    }
    try {
        const payment = await getPaymentStatus(orderCode.value);
        orderId.value = payment.orderId;
        if (payment.status === 'Paid') {
            error.value = 'Đơn hàng này đã được thanh toán và không thể hủy.';
        }
        else if (payment.status !== 'PaymentCancelled') {
            error.value = `Trạng thái hiện tại của đơn hàng: ${payment.status}.`;
        }
    }
    catch (exception) {
        error.value =
            exception instanceof Error
                ? exception.message
                : 'Không thể kiểm tra trạng thái hủy đơn hàng.';
    }
    finally {
        loading.value = false;
    }
}
onMounted(loadCancellation);
const __VLS_ctx = (({}));
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['order-information']} */ ;
/** @type {__VLS_StyleScopedClasses['order-information']} */ ;
/** @type {__VLS_StyleScopedClasses['order-information']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-form']} */ ;
/** @type {__VLS_StyleScopedClasses['cancel-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['order-information']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)(({ class: 'cancel-page' }));
/** @type {__VLS_StyleScopedClasses['cancel-page']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)(({ class: 'cancel-form' }));
/** @type {__VLS_StyleScopedClasses['cancel-form']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)(({ class: 'cancel-icon' }));
/** @type {__VLS_StyleScopedClasses['cancel-icon']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-times-circle' }));
/** @type {__VLS_StyleScopedClasses['pi']} */ ;
/** @type {__VLS_StyleScopedClasses['pi-times-circle']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'description' }));
/** @type {__VLS_StyleScopedClasses['description']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'order-information' }));
/** @type {__VLS_StyleScopedClasses['order-information']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.loading ? 'Đang kiểm tra...' : __VLS_ctx.orderId ? `#${__VLS_ctx.orderId}` : 'Không xác định');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)({});
(__VLS_ctx.orderCode || 'Không xác định');
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
__VLS_asFunctionalElement1(__VLS_intrinsics.strong, __VLS_intrinsics.strong)(({ class: 'cancelled-status' }));
/** @type {__VLS_StyleScopedClasses['cancelled-status']} */ ;
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)(({ class: 'cancel-error' }));
    /** @type {__VLS_StyleScopedClasses['cancel-error']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.i)(({ class: 'pi pi-exclamation-circle' }));
    /** @type {__VLS_StyleScopedClasses['pi']} */ ;
    /** @type {__VLS_StyleScopedClasses['pi-exclamation-circle']} */ ;
    (__VLS_ctx.error);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)(({ class: 'cancel-actions' }));
/** @type {__VLS_StyleScopedClasses['cancel-actions']} */ ;
let __VLS_0;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0(({
	class: 'secondary-action',
	to: '/'
})));
const __VLS_2 = __VLS_1(({
	class: 'secondary-action',
	to: '/'
}), ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['secondary-action']} */ ;
const { default: __VLS_5 } = __VLS_3.slots;
// @ts-ignore
[loading, orderId, orderId, orderCode, error, error,];
var __VLS_3;
let __VLS_6;
/** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
RouterLink;
// @ts-ignore
const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6(({
	class: 'primary-action',
	to: '/?cart=open'
})));
const __VLS_8 = __VLS_7(({
	class: 'primary-action',
	to: '/?cart=open'
}), ...__VLS_functionalComponentArgsRest(__VLS_7));
/** @type {__VLS_StyleScopedClasses['primary-action']} */ ;
const { default: __VLS_11 } = __VLS_9.slots;
// @ts-ignore
[];
var __VLS_9;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
