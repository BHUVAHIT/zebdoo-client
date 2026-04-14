import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const normalizePath = (value) => String(value || '').replaceAll('\\\\', '/')

const manualChunks = (id) => {
  const filePath = normalizePath(id)

  if (filePath.includes('/node_modules/')) {
    if (
      filePath.includes('/react/') ||
      filePath.includes('/react-dom/') ||
      filePath.includes('/scheduler/')
    ) {
      return 'vendor-react'
    }

    if (
      filePath.includes('/react-router/') ||
      filePath.includes('/react-router-dom/')
    ) {
      return 'vendor-router'
    }

    if (
      filePath.includes('/zustand/') ||
      filePath.includes('/formik/') ||
      filePath.includes('/yup/') ||
      filePath.includes('/axios/')
    ) {
      return 'vendor-data'
    }

    if (filePath.includes('/bcryptjs/')) {
      return 'vendor-crypto'
    }

    if (filePath.includes('/lucide-react/')) {
      return 'vendor-icons'
    }

    return 'vendor-misc'
  }

  if (
    filePath.includes('/src/modules/superAdmin/components/SuperAdminLayout') ||
    filePath.includes('/src/modules/superAdmin/components/DashboardStats') ||
    filePath.includes('/src/modules/superAdmin/components/SuperAdminMetricsRail') ||
    filePath.includes('/src/modules/superAdmin/components/metricsRefreshChannel') ||
    filePath.includes('/src/modules/superAdmin/pages/SuperAdminApp')
  ) {
    return 'route-admin-shell'
  }

  if (filePath.includes('/src/modules/admin/dashboard/')) {
    return 'route-admin-dashboard'
  }

  if (filePath.includes('/src/modules/admin/management/')) {
    return 'route-admin-management'
  }

  if (filePath.includes('/src/admin-pages/')) {
    return 'route-admin-testpapers'
  }

  if (
    filePath.includes('/src/modules/community/pages/AdminCommunity') ||
    filePath.includes('/src/modules/community/pages/AdminCommunityOverviewPage') ||
    filePath.includes('/src/modules/community/pages/AdminCommunityAnnouncementsPage') ||
    filePath.includes('/src/modules/community/pages/AdminCommunityModerationPage')
  ) {
    return 'route-admin-community'
  }

  if (filePath.includes('/src/modules/assessment/')) {
    return 'route-assessment'
  }

  if (
    filePath.includes('/src/pages/TestPaper') ||
    filePath.includes('/src/services/testPaperService') ||
    filePath.includes('/src/components/PaperList') ||
    filePath.includes('/src/components/PaperTabs')
  ) {
    return 'route-testpapers'
  }

  if (filePath.includes('/src/modules/student/')) {
    return 'route-student'
  }

  if (filePath.includes('/src/modules/community/')) {
    return 'route-community'
  }

  if (filePath.includes('/src/test/')) {
    return 'route-test'
  }

  return undefined
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 280,
    reportCompressedSize: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks,
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
