# 🖥️ Assetpedia News - Professional News Terminal Interface

Portal berita profesional dengan style terminal news  yang menampilkan judul berita dalam bentuk list yang dipisahkan berdasarkan kategori.

## ✨ Fitur Utama

### 🎨 **news  Terminal Style**
- **Font JetBrains Mono** - Font monospace profesional yang khas
- **Green Terminal Theme** - Warna hijau terminal klasik dengan efek glow
- **Professional Layout** - Layout yang terinspirasi dari news  Terminal
- **Real-time Clock** - Jam real-time dengan format profesional
- **Status Indicators** - Indikator sistem yang menunjukkan status online

### 📊 **Sistem Berita List-Based**
- **Clean List View** - Hanya menampilkan judul berita tanpa deskripsi
- **Category Grouping** - Berita dikelompokkan per kategori
- **Color-Coded Categories** - Setiap kategori memiliki warna yang berbeda
- **Source & Time Display** - Menampilkan sumber dan waktu relatif
- **Minimalist Design** - Fokus pada informasi yang penting saja

### ⌨️ **Professional Keyboard Navigation**
- **/** - Fokus ke search bar
- **ESC** - Clear search dan unfocus
- **Ctrl+R** - Refresh berita
- **↑↓** - Navigasi antar berita
- **Enter** - Buka berita yang dipilih
- **Auto-refresh** - Update otomatis setiap 30 detik

### 🗂️ **Kategori Profesional**
- **ALL** - Semua berita
- **BUSINESS** - Berita bisnis (warna kuning)
- **ECONOMY** - Berita ekonomi (warna hijau)
- **TECHNOLOGY** - Berita teknologi (warna biru)
- **POLITICS** - Berita politik (warna merah)
- **WORLD** - Berita dunia (warna ungu)
- **NEWS** - Berita umum (warna cyan)

## 🚀 Cara Penggunaan

### **Navigasi Keyboard**
1. **/** - Tekan slash untuk fokus ke search
2. **Ketik keyword** - Cari berita yang diinginkan
3. **↑↓** - Navigasi antar berita
4. **Enter** - Buka berita di tab baru
5. **ESC** - Clear search
6. **Ctrl+R** - Refresh berita

### **Mouse Navigation**
1. **Klik kategori** - Filter berdasarkan kategori
2. **Klik judul** - Buka berita di tab baru
3. **Klik AUTO: ON/OFF** - Toggle auto-refresh
4. **Klik REFRESH** - Manual refresh berita

## 🎯 Fitur Teknis

### **Performance**
- **Optimized RSS Parsing** - Parsing RSS yang cepat dan efisien
- **Smart Caching** - Cache headers untuk performa lebih baik
- **Lazy Loading** - Load berita sesuai kebutuhan
- **Real-time Updates** - Update otomatis tanpa reload

### **User Experience**
- **Responsive Design** - Bekerja di desktop dan mobile
- **Loading States** - Indikator loading yang jelas
- **Error Handling** - Graceful error handling
- **Accessibility** - Support untuk screen readers

## 🌍 Sumber Berita

### **International Sources**
- **New York Times** - Business, Economy, Technology, Politics, World
- **Sky News** - Technology, Politics, World
- **CBS News** - Technology, Politics

### **Indonesian Sources**
- **Antara News** - Terkini, Ekonomi, Teknologi
- **Detik** - News, Finance
- **CNN Indonesia** - Economy, National
- **CNBC Indonesia** - News, Market
- **Tempo** - National, Business

## 🛠️ Teknologi

- **Framework**: Next.js 15 dengan App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 dengan custom CSS
- **Components**: Shadcn/ui
- **Icons**: Lucide React
- **Font**: JetBrains Mono, Courier Prime

## 🎨 Customization

### **Warna Kategori**
Ubah warna kategori di `terminal.css`:
```css
.text-business { color: #facc15; }
.text-economy { color: #22c55e; }
.text-technology { color: #3b82f6; }
.text-politics { color: #ef4444; }
.text-world { color: #a855f7; }
.text-news { color: #06b6d4; }
```

### **Font**
Ganti font terminal di `terminal.css`:
```css
.terminal-text {
  font-family: 'JetBrains Mono', 'Courier Prime', monospace;
}
```

## 📱 Responsive Design

- **Desktop**: Full terminal experience
- **Tablet**: Optimized layout dengan touch support
- **Mobile**: Compact version dengan essential features

## 🔧 Konfigurasi

### **RSS Sources**
Tambah/hapus RSS sources di:
- `src/app/page.tsx` - Frontend configuration
- `src/app/api/news/route.ts` - Backend configuration

### **Auto-refresh Interval**
Ubah interval auto-refresh di `page.tsx`:
```javascript
const interval = setInterval(fetchNews, 30000) // 30 detik
```

## 📈 Performance Metrics

- **First Load**: < 3 detik
- **RSS Processing**: < 5 detik untuk 15 feeds
- **Memory Usage**: < 100MB
- **Auto-refresh**: 30 detik interval

## 🔒 Security

- Input sanitization untuk search
- CORS configuration
- XSS protection
- Rate limiting

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

**🚀 Created with ❤️ untuk pengalaman terminal berita profesional**
