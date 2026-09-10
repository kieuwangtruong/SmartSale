<script setup lang="ts">
import { computed } from 'vue'
import { useLanguage } from '../../services/i18n'
import { useAuthStore } from '../../stores/authStore'
import CustomerTierBadge from '../CustomerTierBadge.vue'
import type { UserDto } from '../../services/userApi'

const props = defineProps<{
  show: boolean
  customerProfile: UserDto | null
  editingAddress: string
  savingAddress: boolean
  saveAddressError: string
  saveAddressSuccess: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:editingAddress', val: string): void
  (e: 'save-address'): void
}>()

const { t } = useLanguage()
const auth = useAuthStore()

const displayedCustomerTier = computed(() => {
  const profile = props.customerProfile || auth.user
  return profile?.customerTier || 'Bronze'
})
</script>

<template>
  <div v-if="show">
    <div class="profile-modal-overlay" @click.self="emit('close')" />
    <div class="profile-modal" aria-modal="true" role="dialog">
      <button type="button" class="modal-close-btn" @click="emit('close')" :aria-label="t('Đóng', 'Close')">
        <i class="pi pi-times" />
      </button>
      <div class="modal-header">
        <h2>{{ t('Thông tin cá nhân', 'Personal Information') }}</h2>
      </div>
      <div class="modal-body">
        <div class="profile-details-grid">
          <div class="profile-detail-row">
            <strong>{{ t('Họ và tên:', 'Full Name:') }}</strong>
            <span>{{ customerProfile?.fullName || auth.user?.fullName }}</span>
          </div>
          <div class="profile-detail-row">
            <strong>{{ t('Tên tài khoản:', 'Username:') }}</strong>
            <span>{{ customerProfile?.userName || auth.user?.userName }}</span>
          </div>
          <div class="profile-detail-row">
            <strong>{{ t('Email:', 'Email:') }}</strong>
            <span>{{ customerProfile?.email || auth.user?.email }}</span>
          </div>
          <div class="profile-detail-row">
            <strong>{{ t('Hạng thành viên:', 'Membership Tier:') }}</strong>
            <CustomerTierBadge :tier="displayedCustomerTier" size="sm" variant="badge" :show-discount="true" />
          </div>
        </div>

        <div class="address-edit-section">
          <h3>{{ t('Địa chỉ đặt hàng', 'Shipping Address') }}</h3>
          <textarea 
            :value="editingAddress"
            @input="emit('update:editingAddress', ($event.target as HTMLTextAreaElement).value)"
            class="address-textarea"
            :placeholder="t('Nhập địa chỉ đặt hàng của bạn...', 'Enter your shipping address...')"
          ></textarea>
          <div v-if="saveAddressError" class="address-error-msg">
            <i class="pi pi-exclamation-circle" /> {{ saveAddressError }}
          </div>
          <div v-if="saveAddressSuccess" class="address-success-msg">
            <i class="pi pi-check-circle" /> {{ t('Cập nhật địa chỉ thành công!', 'Address updated successfully!') }}
          </div>
          <button 
            type="button" 
            class="save-address-btn" 
            :disabled="savingAddress"
            @click="emit('save-address')"
          >
            <i v-if="savingAddress" class="pi pi-spin pi-spinner" />
            <i v-else class="pi pi-save" />
            <span>{{ savingAddress ? t('Đang lưu...', 'Saving...') : t('Cập nhật địa chỉ', 'Update Address') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
