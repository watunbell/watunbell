# Flow Cytometry Simulator

เครื่องจำลองผล flow cytometry แบบ interactive (single-file HTML) สำหรับการเรียนการสอน PBMC immunophenotyping

เปิดใช้งาน: เปิดไฟล์ `index.html` ในเบราว์เซอร์ได้ทันที ไม่ต้องติดตั้งอะไร

## ความสามารถ
- **Dot plot + density coloring** เลือกแกน X/Y ได้จากทุกช่องสัญญาณ (FSC, SSC, CD3, CD4, CD8, CD19, CD56, CD14)
- **Interactive gating** ลากเมาส์วาด gate บน Plot A แล้ว Plot B/C จะแสดงเฉพาะเซลล์ใน gate
- **Quadrant analysis** ลาก crosshair แบ่ง 4 quadrant พร้อมคำนวณ % อัตโนมัติ (เช่น CD4 x CD8)
- **Histogram** ของ marker ที่เลือก
- ปรับสัดส่วนประชากรเซลล์ (lymphocyte/monocyte/granulocyte/debris), subset (T/B/NK), CD4:CD8 ratio, instrument noise และจำลอง spillover
- Preset: ปกติ / CD4 ต่ำ
- รองรับธีมสว่าง-มืด

> หมายเหตุ: ข้อมูลทั้งหมดเป็นการจำลองเชิงการศึกษา ไม่ใช่ผลตรวจจริง
