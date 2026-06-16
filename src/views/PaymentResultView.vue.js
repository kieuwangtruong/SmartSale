import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { getPaymentStatus } from '../services/orderApi';
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const status = ref(null);
const error = ref('');
const orderCode = computed(() => String(route.query.orderCode ?? ''));
const content = computed(() => {
    const current = status.value;
    if (current === 'Paid') {
        return {
            icon: 'pi pi-check-circle',
            title: 'Thanh toán thành công',
            message: 'Đơn hàng đã được thanh toán và chuyển sang xử lý.',
            tone: 'success',
        };
    }
    if (current === 'PaymentCancelled' || route.name === 'payment-cancelled') {
        return {
            icon: 'pi pi-times-circle',
            title: 'Thanh toán đã hủy',
            message: 'Sản phẩm vẫn được giữ trong giỏ hàng để bạn có thể thử lại.',
            tone: 'warning',
        };
    }
    if (current === 'PaymentExpired' || route.name === 'payment-expired') {
        return {
            icon: 'pi pi-clock',
            title: 'LIÊN KẾT ĐÃ HẾT HẠN',
            message: 'Liên kết thanh toán chỉ có hiệu lực trong 10 phút.',
            tone: 'warning',
        };
    }
    if (current === 'PaymentFailed' || route.name === 'payment-failed') {
        return {
            icon: 'pi pi-exclamation-triangle',
            title: 'THANH TOÁN THẤT BẠI',
            message: 'Không thể hoàn tất thanh toán. Sản phẩm vẫn còn trong giỏ hàng.',
            tone: 'danger',
        };
    }
    return {
        icon: 'pi pi-spin pi-spinner',
        title: 'ĐANG XÁC NHẬN THANH TOÁN',
        message: 'Hệ thống đang chờ xác nhận an toàn từ PayOS.',
        tone: 'pending',
    };
});
async function loadStatus() {
    if (!orderCode.value) {
        error.value = 'Thiếu mã thanh toán.';
        loading.value = false;
        return;
    }
    try {
        const result = await getPaymentStatus(orderCode.value);
        status.value = result.status;
        if (result.status === 'Paid') {
            localStorage.removeItem('storefront-cart');
        }
        else if (result.status === 'PaymentExpired' && route.name !== 'payment-expired') {
            await router.replace({ name: 'payment-expired', query: { orderCode: orderCode.value } });
        }
        else if (result.status === 'PaymentFailed' && route.name !== 'payment-failed') {
            await router.replace({ name: 'payment-failed', query: { orderCode: orderCode.value } });
        }
    }
    catch (exception) {
        error.value = exception instanceof Error ? exception.message : 'Không thể kiểm tra thanh toán.';
    }
    finally {
        loading.value = false;
    }
}
onMounted(async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
        await loadStatus();
        if (status.value && !['PendingPayment', 'ProcessingPayment'].includes(status.value))
            break;
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['result-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['result-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['result-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['result-actions']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.main, __VLS_intrinsics.main)({
    ...{ class: "payment-result" },
});
/** @type {__VLS_StyleScopedClasses['payment-result']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.section, __VLS_intrinsics.section)({
    ...{ class: "result-card" },
    ...{ class: (__VLS_ctx.content.tone) },
});
/** @type {__VLS_StyleScopedClasses['result-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
    ...{ class: "result-icon" },
});
/** @type {__VLS_StyleScopedClasses['result-icon']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.i)({
    ...{ class: (__VLS_ctx.content.icon) },
});
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({});
(__VLS_ctx.loading ? 'Đang kiểm tra thanh toán' : __VLS_ctx.content.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
(__VLS_ctx.error || __VLS_ctx.content.message);
if (__VLS_ctx.orderCode) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.small, __VLS_intrinsics.small)({});
    (__VLS_ctx.orderCode);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "result-actions" },
});
/** @type {__VLS_StyleScopedClasses['result-actions']} */ ;
if (__VLS_ctx.status !== 'Paid') {
    let __VLS_0;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
        to: "/?cart=open",
    }));
    const __VLS_2 = __VLS_1({
        to: "/?cart=open",
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    const { default: __VLS_5 } = __VLS_3.slots;
    // @ts-ignore
    [content, content, content, content, loading, error, orderCode, orderCode, status,];
    var __VLS_3;
}
else {
    let __VLS_6;
    /** @ts-ignore @type { | typeof __VLS_components.RouterLink | typeof __VLS_components.RouterLink} */
    RouterLink;
    // @ts-ignore
    const __VLS_7 = __VLS_asFunctionalComponent1(__VLS_6, new __VLS_6({
        to: "/",
    }));
    const __VLS_8 = __VLS_7({
        to: "/",
    }, ...__VLS_functionalComponentArgsRest(__VLS_7));
    const { default: __VLS_11 } = __VLS_9.slots;
    // @ts-ignore
    [];
    var __VLS_9;
}
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
