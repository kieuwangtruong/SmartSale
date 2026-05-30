<template>
  <main class="about-view">
    <section class="about-card">
      <p class="about-kicker">About</p>
      <h1>Giao diện quản lý đơn hàng</h1>
      <p>
        Đây là khu vực giới thiệu ngắn gọn cho dự án. Hiện tại app đang tập trung vào quản lý đơn
        hàng, còn phần đăng nhập và các trang phụ sẽ phát triển sau.
      </p>
    </section>
  </main>
</template>

<style scoped>
.about-view {
  min-height: 60vh;
  display: grid;
  place-items: center;
}

.about-card {
  width: min(760px, 100%);
  border-radius: 24px;
  padding: 2rem;
  background: rgba(11, 18, 32, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 24px 70px rgba(2, 6, 23, 0.35);
}

.about-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #93c5fd;
  font-size: 0.72rem;
  margin-bottom: 0.5rem;
}

h1 {
  color: #f8fafc;
  margin-bottom: 0.75rem;
}

p {
  color: #cbd5e1;
}
</style>
