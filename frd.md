# Gereksinim Yönetimi Sistemi (RMS) Teknik Şartnamesi

## 1. Giriş ve Amaç

Bu doküman, karmaşık projelerde teknik şartnamelerin dijitalleştirilmesi, disiplinler arası (mekanik, yazılım, elektronik vb.) koordinasyonun sağlanması ve tam izlenebilirlik (traceability) sunulması amacıyla geliştirilecek yazılımın gereksinimlerini tanımlar.

Yazılım modüler olarak tasarlanacaktır. İlişkisel veritabanına sahip olacaktır. Dışarıdan eklenecek dosyalar (Word, PDF, Excel vb.) dosya sistemi içinde tutulacak, değişiklikler versiyonlanacaktır.

---

## 2. Veri Girişi ve Gereksinim Tanımlama

### 2.1. Akıllı İçe Aktarma (Import)

* **Şartname Ayrıştırma:** Sistem; PDF ve Word formatındaki teknik şartnameleri içe aktarabilmelidir.
* **Otomatik Maddeleştirme:** Metin içerisindeki maddeler (örn: Madde 3.2.1) otomatik olarak ayrıştırılarak her biri bağımsız birer "Gereksinim" (Requirement) olarak kaydedilmelidir.
* **Standart Entegrasyonu:** Projeye dahil edilen dış standartlar (ISO, MIL-STD vb.) sistem kütüphanesine eklenmeli ve bu standartların maddeleri de gereksinim olarak aktarılabilmelidir.

### 2.2. Gereksinim Öznitelikleri ve Organizasyon

* **Benzersiz Numaralandırma:** Her gereksinim, sistem tarafından üretilen benzersiz bir ID (örn: REQ-001, SYS-102) ile takip edilmelidir.
* **Tip Belirleme (Açıklama Modu):** Bazı maddelerin sadece bilgilendirme amaçlı (gereksinim veya gerekçe) olduğunu belirtmek için bir **"Açıklama" (Checkbox)** alanı bulunmalıdır.
* **Bilgilendirme Kuralı:** "Informational Only" seçili ise Disiplin "-", Gereksinim Tipi "Açıklama", Doğrulama Metodu "-" olarak gösterilir.
* **Disiplin Ayrımı:** Gereksinimler, aşağıdaki disiplinlere göre kategorize edilebilmelidir (Pulldown Menu):
  - Sistem
  - Mekanik
  - Yazılım
  - Elektronik
  - Otomasyon
  - Optik
  - Diğer (Özelleştirilebilir)
* **Türetilmiş İsterler:** Mevcut bir gereksinimden yeni alt isterler (derived requirements) oluşturulabilmeli ve bunlar hiyerarşik olarak ana gereksinime bağlanmalıdır.
* **Gereksinim Metni:** "Gereksinim" alanı çok satırlı (multi-line) metin kutusu olarak girilmelidir.
* **Gerekçe:** "Gerekçe" alanı tek satırlı (single line) metin kutusu olarak girilmelidir.
* **Requirement Type:** Gereksinimler aşağıdaki tiplere göre kategorize edilebilmelidir (pulldown menu):
  - Functional
  - Performance
  - Safety
  - Security
  - Regulatory
  - Interface
  - Constraint
* **Doğrulama Metodu:** Gereksinimler aşağıdaki metodlar ile doğrulanabilmelidir (checkbox'lı çoklu seçimli pulldown):
  - Analysis
  - Test
  - Inspection
  - Gösterim
  - Certificate of Conformity
* **Gereksinim ID Formatı:** `[SİSTEM]-[ALT SİSTEM]-[TİP]-[NUMARA]` şeklinde üretilir.
  - Sistem kodu 3 karakterdir ve proje bazlı tanımlanır.
  - Alt sistem kodu 3 karakterdir; proje bazlı düzenlenebilir. Varsayılan: GEN/RAD/DET/SFT/MKN/SNG/OPT.
  - Gereksinim tipi kodu 2 karakterdir (Fonksiyonel/Performans/Emniyet/Güvenlik/Regülasyon/Arayüz/Kısıt/Açıklama).
  - Numara 4 hanelidir ve **sistem-alt sistem-tip** kombinasyonu bazında artar.
* **Numaralandırma Zamanı:** Gereksinim İncelemede/Onaylı durumuna geçerken otomatik atanır.
* **Global Req ID:** Projeler arasında tekil `REQ-0000001` formatında kimliktir; import sırasında atanır ve ekranda bilgi olarak gösterilir. Projeler arası linkleme bu ID ile yapılır.
* **Proje Bazlı Seçim:** Requirement Library seçimleri aktif proje bazında değerlendirilir; aynı ID farklı projelerde olsa dahi detay formu yalnızca aktif projenin verisini gösterir.

### 2.3. Düzenleme ve Görselleştirme

* **Zengin Metin Editörü:** Gereksinim detaylarında tablo, görsel, şema ve matematiksel formül desteği bulunmalıdır.
* **Hiyerarşik Yapı:** Gereksinimler; **Epic > Feature > User Story** veya **Sistem > Alt Sistem > Bileşen** kırılımında görüntülenebilmelidir.
* **Şablon Desteği:** "Bir [rol] olarak, [amaç] istiyorum..." gibi standart formatlar için hazır taslaklar sunulmalıdır.

---

## 3. Versiyon Kontrolü ve İş Akışı

### 3.1. Tarihçe ve Geri Dönüş

* **Versiyon Kontrolü:** Bir gereksinim üzerindeki her değişiklik (kim, ne zaman, neyi değiştirdi?) kayıt altına alınmalıdır.
* **Baseline Oluşturma:** Projenin belirli aşamalarında gereksinimlerin "anlık görüntüsü" (Snapshot) alınarak dondurulabilmelidir.

### 3.2. Onay Mekanizması

* **İş Akışı (Workflow):** Gereksinimler; `Taslak`, `İncelemede`, `Onaylandı`, `Reddedildi` gibi statülere sahip olmalıdır.
* **İşbirliği:** Madde bazlı yorum yapma ve @etiketleme (mention) özelliği ile ilgili mühendise bildirim gitmelidir.
* **E-İmza:** Kritik sektör gereksinimleri için resmi onay ve elektronik imza süreci işletilmelidir.

---

## 4. İzlenebilirlik ve Analiz (Traceability)

### 4.1. İzlenebilirlik Matrisi (RTM)

* **Uçtan Uca Takip:** Gereksinimlerin; tasarım dokümanları, alt sistemler ve test senaryoları ile olan ilişkisi bir tablo (matris) üzerinden izlenebilmelidir.

### 4.2. Etki Analizi (Impact Analysis)

* Bir gereksinim güncellendiğinde, bu maddeye bağlı olan tüm alt gereksinimler ve testler otomatik olarak "Şüpheli" (Suspect) olarak işaretlenmeli ve analiz edilmesi istenmelidir.

---

## 5. Önceliklendirme ve Planlama

### 5.1. Puanlama Modelleri

* Sistem; **MoSCoW** (Must, Should, Could, Won't), **RICE** veya **WSJF** gibi metotlarla otomatik öncelik puanı hesaplayabilmelidir.

### 5.2. Görsel Planlama

* **Yol Haritası (Roadmap):** Gereksinimlerin zaman çizelgesi (Gantt) üzerinde dağılımı.
* **Kapasite Yönetimi:** Gereksinimlerin iş yükü puanlarına göre disiplinlere ve ekiplere atanması.

---

## 6. Teknik Gereksinimler

* **Entegrasyon:** Jira, Azure DevOps veya Enterprise Architect ile çift yönlü senkronizasyon.
* **Dışa Aktarım:** Gereksinimlerin PDF/Word formatında resmî doküman olarak çıktı alınabilmesi.
* **Veri Saklama:** Uygulama verileri SQLite veritabanında saklanır.
* **Veri Erişimi:** Uygulama, state verisini `/api/state` üzerinden okur/yazar; sağlık kontrolü için `/api/health` kullanılır.
* **Migrasyon:** Mevcut localStorage verileri ilk başlatmada SQLite'a aktarılır.

---

## 7. UI Yerleşimi ve Sekmeler

* **Header Sekmeleri:** Import / New Requirement / Requirement Library vb. sekmeler header alanında yer alır.
* **Import Tab:** "Ingest specifications, structure them fast." formu yalnızca Import tabında yer alır.
* **New Requirement Tab:** Sol panelde "New Requirement" formu, sağ panelde kaydırılabilir "Document Library" listesi bulunur. Başlıklarda aktif proje adı görünür.
* **Requirement Library Tab:** Gereksinim listesi ve detay formu aynı tab içinde yan yana görüntülenir. Listeden seçilen gereksinim detay panelinde güncellenir. Requirement Library / Requirement Detail başlıklarında aktif proje adı görünür.
* **Filtreler:** Requirement Library listesi, Discipline / Workflow Status / Informational Only filtreleriyle daraltılabilir.
* **Form Dizilimi:** Requirement Detail formunda "ID / Spec Clause / Informational Only" en üstte aynı satırdadır; "Parent Requirement" alt satırdadır; "Alt Sistem / Discipline / Requirement Type / Doğrulama Metodu" aynı satırdadır; "Standards / Reference Docs" aynı satırdadır; "Workflow Status / Hedef Faz / Effort Points" aynı satırdadır.
* **Gereksinim / Gerekçe:** "Gereksinim" çok satırlı, "Gerekçe" tek satırlı alan olarak yer alır.
* **Comments & Versions:** Ayrı bir tab yoktur. Yorumlar ve versiyon geçmişi Requirement Library tabında, detay ve liste panellerinin altında görünür.
* **Detay Navigasyon:** Requirement Detail formunun altında **Önceki / Sonraki / Değişiklikleri Kaydet** butonları bulunur. Önceki/Sonraki seçili gereksinimin listede bir önceki/sonraki maddesine gider. Seçili gereksinim listede scroll ile görünür ve kalın çerçeve ile vurgulanır (yalnızca Requirement Library listesinde). Önceki/Sonraki butonları ilk/son öğede pasif olur. Kaydetmeden önce Önceki/Sonraki'ye basılırsa **Kaydet / Devam Et / İptal** seçenekli uyarı gösterilir.
* **Otomatik Sakla:** "Otomatik Sakla" seçiliyse, **Sonraki** butonu mevcut değişiklikleri otomatik kaydeder ve bir sonraki gereksinime geçer.
* **CSV Şablonu:** CSV şablonu "spec clause | rationale | verification method" kolonlarını içerir; doğrulama metodu virgülle ayrılmış çoklu değer kabul eder.
* **Form Tutarlılığı:** Yeni Gereksinim formu ile Gereksinim Detay formu aynı alanlar ve aynı dizilim ile sunulur.

---

## 8. Çoklu Kullanıcı ve Proje Yönetimi

* **Kullanıcı Girişi:** Kullanıcı e-posta ve şifre ile giriş yapar.
* **Proje Seçimi:** Giriş sonrası kullanıcı, yetkili olduğu projelerden birini seçer ve sadece o proje verilerini görür.
* **Proje Bazlı Veri İzolasyonu:** Gereksinimler, baseline'lar ve önceliklendirme verileri proje bazlı tutulur.
* **Gerçek Zamanlı Senkronizasyon:** Aynı proje üzerinde çalışan kullanıcılar arasında gereksinim ekleme/güncelleme işlemleri otomatik olarak senkronize edilir. İstemci tarafı belirli aralıklarla (ör. 5 sn) sunucudaki durumu kontrol eder ve yerel değişiklik yoksa ekranı günceller.
* **Admin Page:** Admin rolündeki kullanıcılar için kullanıcı yönetimi, proje oluşturma, proje-kullanıcı yetkilendirme ve proje kataloğu (düzenleme) ekranı bulunur.
* **Yetkilendirme Rolleri:** Admin, Supervisor, User rolleri desteklenir. Proje içindeki atamalarda Editor / Viewer rolleri kullanılır.

---

## 9. Standart ve Referans Dokümanları

* **Gereksinim Bazlı Referanslar:** Her gereksinime bağlı standartlar (ISO, MIL-STD vb.) ve diğer referans dokümanlar eklenebilmelidir.
* **Veri Girişi:** Standartlar ve referans dokümanlar alanları virgülle ayrılımış şekilde girilebilmelidir.

---

## 10. ReqIF Desteği

* **İthalat (Import):** ReqIF (.reqif/.xml) dosyaları içeri aktarılabilmelidir.
* **İhracat (Export):** Seçili proje için ReqIF dosyası dışarı aktarılabilmelidir.
* **Alan Eşleşmesi:** ReqIF içindeki temel alanlar (Title, Description, Status, Discipline, Faz, Effort, Standards, Documents, Parent) gereksinim alanlarına eşlenir. Title -> Gereksinim, Description -> Gerekçe.

---

## 11. ReqIF Gelişmiş Eşleme

* **Spec Types:** SpecObjectType ve AttributeDefinition (String/Integer/Boolean) tanımları üretilir.
* **Zorunlu Alanlar:** Identifier, Title, Description alanları ReqIF içinde bulunmalıdır (Title -> Gereksinim, Description -> Gerekçe).
* **Enum Alanlar:** Status, Discipline, Faz ve Role alanları enum olarak tanımlanır.
* **İzlenebilirlik:** Parent-Child ilişkileri SpecRelations ile temsil edilir.
* **Uyumluluk:** ReqIF 1.1 yapısı ile uyumlu çıktı üretilir.

---

## 12. Admin ve Supervisor Yetkileri

* **Admin Rolü:** Kullanıcı ve proje oluşturabilir; tüm projelerde yetkilendirme yapabilir.
* **Supervisor Rolü:** Yetkili olduğu projelerde ekip dahil etme / çıkarma yapabilir.
* **Proje Kataloğu:** Admin ve Supervisor, mevcut projelerin ad, müşteri, başlangıç, bitiş ve açıklama alanlarını güncelleyebilir.
* **JSON İçe Aktarım:** Admin panelinden JSON içe aktarılabilir. İçe aktarmadan önce "Mevcut tüm veriler değiştirilecektir." uyarısı ile onay istenir; opsiyonel olarak mevcut veriler için yedek JSON indirilir. İşlem sonucu Admin panelinde durum mesajı ile gösterilir.
* **Sistem Kodu & Alt Sistemler:** Proje tanımında 3 karakterlik sistem kodu ve alt sistem listesi (GEN/RAD/DET/SFT/MKN/SNG/OPT varsayılan) düzenlenebilir.
* **Proje Silme:** Admin ve Supervisor projeyi silebilir; projeye bağlı gereksinimler, baseline'lar ve üyelikler de temizlenir.
* **Erişim Denetimi:** Supervisor yalnızca bağlı olduğu projeleri görür ve bu projelerde yetki yönetir.

---

## 13. Dil Seçimi

* **Çoklu Dil:** Uygulama Türkçe ve İngilizce dillerini destekler.
* **Kullanıcı Seçimi:** Kullanıcı arayüz dilini seçerek kullanır; seçim tarayıcıda saklanır.

---

## 14. Versiyonlama ve Ortam Ayrımı

* **Versiyon Dosyası:** Uygulama sürümü `version.md` dosyasında tutulur.
* **Sürüm Formatı:** `MAJOR.MINOR` formatı kullanılır (ör: 1.7).
* **Artış Kuralı:** Kullanıcı "revizyon atlat" demedikçe, her kod geliştirmesinde **MINOR** bir artar.
* **Başlık Bilgisi:** Üst başlık alt metni `hostname - v{version}` şeklinde gösterilir (örn: `server01 - v1.7`).
