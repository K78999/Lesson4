import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { getLocales } from 'expo-localization';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar as NativeStatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Student = {
  id: string;
  name: string;
  studentId: string;
  email: string;
  avatar: string;
};

type Screen = 'list' | 'detail' | 'form';
type Language = 'vi' | 'en';

const STORAGE_KEY = '@student-manager/students';
const initialStudent: Student = {
  id: 'BIT240120',
  name: 'Trần Gia Khánh',
  studentId: 'BIT240120',
  email: 'bit240120@st.cmcu.edu.vn',
  avatar: '',
};

const copy = {
  vi: {
    appName: 'Quản lý sinh viên',
    subtitle: 'Hồ sơ sinh viên của bạn',
    students: 'Sinh viên',
    studentCount: (count: number) => `${count} sinh viên`,
    search: 'Tìm theo tên, mã số hoặc email',
    add: 'Thêm sinh viên',
    emptyTitle: 'Chưa có sinh viên nào',
    emptyBody: 'Thêm hồ sơ đầu tiên để bắt đầu quản lý.',
    details: 'Thông tin sinh viên',
    edit: 'Chỉnh sửa',
    delete: 'Xóa sinh viên',
    back: 'Quay lại',
    createTitle: 'Thêm sinh viên',
    editTitle: 'Chỉnh sửa hồ sơ',
    name: 'Họ và tên',
    studentId: 'Mã số sinh viên',
    email: 'Email',
    avatar: 'Ảnh đại diện',
    avatarHint: 'Chọn ảnh từ thiết bị hoặc dán liên kết ảnh.',
    choosePhoto: 'Chọn ảnh từ thiết bị',
    imageUrl: 'Liên kết ảnh (https://...)',
    save: 'Lưu hồ sơ',
    cancel: 'Hủy',
    confirmEditTitle: 'Xác nhận chỉnh sửa',
    confirmEdit: 'Bạn có muốn sửa thông tin SV không?',
    confirmDeleteTitle: 'Xác nhận xóa',
    confirmDelete: 'Bạn có muốn xóa thông tin SV không?',
    yes: 'Có',
    no: 'Không',
    required: 'Vui lòng nhập đầy đủ họ tên, mã số sinh viên và email.',
    invalidEmail: 'Email không hợp lệ.',
    invalidUrl: 'Liên kết ảnh phải bắt đầu bằng http:// hoặc https://.',
    duplicateId: 'Mã số sinh viên này đã tồn tại.',
    duplicateEmail: 'Email này đã được sử dụng.',
    loadError: 'Không thể tải dữ liệu sinh viên.',
    saveError: 'Không thể lưu dữ liệu. Vui lòng thử lại.',
    photoError: 'Không thể mở hoặc lưu ảnh. Vui lòng thử lại.',
    photoPermission: 'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.',
    deleteError: 'Không thể xóa sinh viên. Vui lòng thử lại.',
    unnamed: 'Sinh viên',
  },
  en: {
    appName: 'Student Manager',
    subtitle: 'Your student directory',
    students: 'Students',
    studentCount: (count: number) => `${count} ${count === 1 ? 'student' : 'students'}`,
    search: 'Search name, student ID, or email',
    add: 'Add student',
    emptyTitle: 'No students yet',
    emptyBody: 'Add your first student profile to get started.',
    details: 'Student details',
    edit: 'Edit',
    delete: 'Delete student',
    back: 'Back',
    createTitle: 'Add student',
    editTitle: 'Edit profile',
    name: 'Full name',
    studentId: 'Student ID',
    email: 'Email',
    avatar: 'Profile photo',
    avatarHint: 'Choose a photo from your device or paste an image link.',
    choosePhoto: 'Choose photo from device',
    imageUrl: 'Image link (https://...)',
    save: 'Save profile',
    cancel: 'Cancel',
    confirmEditTitle: 'Confirm changes',
    confirmEdit: 'Do you want to edit this student information?',
    confirmDeleteTitle: 'Confirm deletion',
    confirmDelete: 'Do you want to delete this student information?',
    yes: 'Yes',
    no: 'No',
    required: 'Enter a name, student ID, and email.',
    invalidEmail: 'Enter a valid email address.',
    invalidUrl: 'Image link must start with http:// or https://.',
    duplicateId: 'This student ID already exists.',
    duplicateEmail: 'This email is already in use.',
    loadError: 'Could not load student data.',
    saveError: 'Could not save data. Please try again.',
    photoError: 'Could not open or save the photo. Please try again.',
    photoPermission: 'Photo library access is needed to choose a profile photo.',
    deleteError: 'Could not delete the student. Please try again.',
    unnamed: 'Student',
  },
} satisfies Record<Language, Record<string, string | ((count: number) => string)>>;

const palette = {
  ink: '#182537',
  muted: '#718096',
  primary: '#3568E8',
  paleBlue: '#EDF3FF',
  background: '#F5F7FB',
  white: '#FFFFFF',
  border: '#E5EAF2',
  danger: '#D94242',
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('');
}

function App() {
  const [language, setLanguage] = useState<Language>(() =>
    getLocales()[0]?.languageCode?.toLowerCase() === 'vi' ? 'vi' : 'en',
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [screen, setScreen] = useState<Screen>('list');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');

  const t = copy[language];
  const selectedStudent = students.find((student) => student.id === selectedStudentId);
  const editingStudent = students.find((student) => student.id === editingStudentId);
  const filteredStudents = students.filter((student) => {
    const query = searchText.trim().toLocaleLowerCase();
    return (
      !query ||
      student.name.toLocaleLowerCase().includes(query) ||
      student.studentId.toLocaleLowerCase().includes(query) ||
      student.email.toLocaleLowerCase().includes(query)
    );
  });

  useEffect(() => {
    const refreshLanguage = () => {
      setLanguage(getLocales()[0]?.languageCode?.toLowerCase() === 'vi' ? 'vi' : 'en');
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshLanguage();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;
    const loadStudents = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: Student[] = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(parsed)) throw new Error('Stored student data is not a list');
        if (active) {
          if (parsed.length > 0) {
            setStudents(parsed);
          } else {
            const seeded = [initialStudent];
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
            setStudents(seeded);
          }
        }
      } catch (loadError) {
        console.error('Failed to load student records:', loadError);
        if (active) setLoadFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadStudents();
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => {
    setName('');
    setStudentId('');
    setEmail('');
    setAvatar('');
    setError('');
    setEditingStudentId(null);
  };

  const startCreate = () => {
    resetForm();
    setScreen('form');
  };

  const startEdit = (student: Student) => {
    setEditingStudentId(student.id);
    setName(student.name);
    setStudentId(student.studentId);
    setEmail(student.email);
    setAvatar(student.avatar);
    setError('');
    setScreen('form');
  };

  const persistStudents = async (nextStudents: Student[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextStudents));
    setStudents(nextStudents);
  };

  const saveStudent = async () => {
    const cleanName = name.trim();
    const cleanId = studentId.trim();
    const cleanEmail = email.trim();
    const cleanAvatar = avatar.trim();
    if (!cleanName || !cleanId || !cleanEmail) {
      setError(t.required);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError(t.invalidEmail);
      return;
    }
    if (
      cleanAvatar &&
      !/^https?:\/\//i.test(cleanAvatar) &&
      !cleanAvatar.startsWith('file://') &&
      !cleanAvatar.startsWith('content://') &&
      !cleanAvatar.startsWith('blob:')
    ) {
      setError(t.invalidUrl);
      return;
    }
    const duplicate = students.find(
      (student) =>
        student.id !== editingStudentId &&
        (student.studentId.toLocaleLowerCase() === cleanId.toLocaleLowerCase() ||
          student.email.toLocaleLowerCase() === cleanEmail.toLocaleLowerCase()),
    );
    if (duplicate) {
      setError(
        duplicate.studentId.toLocaleLowerCase() === cleanId.toLocaleLowerCase()
          ? t.duplicateId
          : t.duplicateEmail,
      );
      return;
    }

    const nextStudent: Student = {
      id: editingStudentId ?? makeId(),
      name: cleanName,
      studentId: cleanId,
      email: cleanEmail,
      avatar: cleanAvatar,
    };
    const nextStudents = editingStudentId
      ? students.map((student) => (student.id === editingStudentId ? nextStudent : student))
      : [...students, nextStudent];

    const commit = async () => {
      try {
        await persistStudents(nextStudents);
        setSelectedStudentId(nextStudent.id);
        setScreen(editingStudentId ? 'detail' : 'list');
        resetForm();
      } catch (saveError) {
        console.error('Failed to save student record:', saveError);
        setError(t.saveError);
      }
    };

    if (editingStudentId) {
      Alert.alert(t.confirmEditTitle, t.confirmEdit, [
        { text: t.no, style: 'cancel' },
        { text: t.yes, onPress: () => void commit() },
      ]);
    } else {
      await commit();
    }
  };

  const deleteStudent = (student: Student) => {
    Alert.alert(t.confirmDeleteTitle, t.confirmDelete, [
      { text: t.no, style: 'cancel' },
      {
        text: t.yes,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              const nextStudents = students.filter((item) => item.id !== student.id);
              await persistStudents(nextStudents);
              setSelectedStudentId(null);
              setScreen('list');
            } catch (deleteError) {
              console.error('Failed to delete student record:', deleteError);
              Alert.alert(t.appName, t.deleteError);
            }
          })();
        },
      },
    ]);
  };

  const chooseAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.appName, t.photoPermission);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;

      const selectedUri = result.assets[0].uri;
      if (Platform.OS === 'web') {
        setAvatar(selectedUri);
      } else {
        const directory = new Directory(Paths.document, 'student-avatars');
        if (!directory.exists) directory.create({ idempotent: true, intermediates: true });
        const extension = result.assets[0].fileName?.split('.').pop() || 'jpg';
        const destination = new File(directory, `${makeId()}.${extension}`);
        await new File(selectedUri).copy(destination);
        setAvatar(destination.uri);
      }
      setError('');
    } catch (photoError) {
      console.error('Failed to select or persist avatar:', photoError);
      Alert.alert(t.appName, t.photoError);
    }
  };

  const goBack = () => {
    if (screen === 'form') {
      resetForm();
      setScreen(editingStudentId ? 'detail' : 'list');
    } else if (screen === 'detail') {
      setScreen('list');
      setSelectedStudentId(null);
    }
  };

  const renderAvatar = (student: Pick<Student, 'name' | 'avatar'>, size: number) => (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        !student.avatar && styles.avatarPlaceholder,
      ]}
    >
      {student.avatar ? (
        <Image source={{ uri: student.avatar }} style={styles.avatarImage} />
      ) : (
        <Text style={[styles.avatarInitials, { fontSize: Math.max(16, size * 0.3) }]}>
          {initials(student.name) || '?'}
        </Text>
      )}
    </View>
  );

  const renderList = () => (
    <>
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.eyebrow}>{t.subtitle}</Text>
          <Text style={styles.appTitle}>{t.appName}</Text>
        </View>
        <View style={styles.languageBadge}>
          <Text style={styles.languageBadgeText}>{language.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.listHeading}>
        <View>
          <Text style={styles.sectionTitle}>{t.students}</Text>
          <Text style={styles.sectionSubtitle}>
            {typeof t.studentCount === 'function' ? t.studentCount(students.length) : ''}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={startCreate} style={styles.addButton}>
          <Text style={styles.addButtonPlus}>＋</Text>
          <Text style={styles.addButtonText}>{t.add}</Text>
        </Pressable>
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel={t.search}
          value={searchText}
          onChangeText={setSearchText}
          placeholder={t.search}
          placeholderTextColor="#9AA6B6"
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText('')} accessibilityLabel={t.cancel}>
            <Text style={styles.clearSearch}>×</Text>
          </Pressable>
        )}
      </View>
      {filteredStudents.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>♧</Text>
          </View>
          <Text style={styles.emptyTitle}>{t.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{t.emptyBody}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.studentList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSelectedStudentId(item.id);
                setScreen('detail');
              }}
              style={({ pressed }) => [styles.studentCard, pressed && styles.pressed]}
            >
              {renderAvatar(item, 58)}
              <View style={styles.studentSummary}>
                <Text style={styles.studentName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.studentMeta}>{item.studentId}</Text>
                <Text style={styles.studentEmail} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </>
  );

  const renderDetail = () => {
    if (!selectedStudent) return renderList();
    return (
      <>
        <View style={styles.pageHeader}>
          <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backText}>{t.back}</Text>
          </Pressable>
          <Text style={styles.pageHeaderTitle}>{t.details}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileHero}>
            {renderAvatar(selectedStudent, 112)}
            <Text style={styles.profileName}>{selectedStudent.name}</Text>
            <View style={styles.studentIdBadge}>
              <Text style={styles.studentIdBadgeText}>{selectedStudent.studentId}</Text>
            </View>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t.name}</Text>
            <Text style={styles.infoValue}>{selectedStudent.name}</Text>
            <View style={styles.divider} />
            <Text style={styles.infoLabel}>{t.studentId}</Text>
            <Text style={styles.infoValue}>{selectedStudent.studentId}</Text>
            <View style={styles.divider} />
            <Text style={styles.infoLabel}>{t.email}</Text>
            <Text style={styles.infoValue}>{selectedStudent.email}</Text>
          </View>
          <Pressable
            onPress={() => startEdit(selectedStudent)}
            accessibilityRole="button"
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>✎  {t.edit}</Text>
          </Pressable>
          <Pressable
            onPress={() => deleteStudent(selectedStudent)}
            accessibilityRole="button"
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>{t.delete}</Text>
          </Pressable>
        </ScrollView>
      </>
    );
  };

  const renderForm = () => (
    <>
      <View style={styles.pageHeader}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>{t.back}</Text>
        </Pressable>
        <Text style={styles.pageHeaderTitle}>
          {editingStudentId ? t.editTitle : t.createTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.formIntro}>{t.avatarHint}</Text>
          <View style={styles.photoSection}>
            {renderAvatar({ name: name || t.unnamed, avatar }, 96)}
            <Pressable onPress={() => void chooseAvatar()} style={styles.photoButton}>
              <Text style={styles.photoButtonText}>{t.choosePhoto}</Text>
            </Pressable>
          </View>
          <Text style={styles.fieldLabel}>{t.avatar}</Text>
          <TextInput
            value={avatar.startsWith('http') ? avatar : ''}
            onChangeText={setAvatar}
            placeholder={t.imageUrl}
            placeholderTextColor="#9AA6B6"
            autoCapitalize="none"
            keyboardType="url"
            style={styles.textInput}
          />
          <Text style={styles.fieldLabel}>{t.name}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.name}
            placeholderTextColor="#9AA6B6"
            style={styles.textInput}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Text style={styles.fieldLabel}>{t.studentId}</Text>
          <TextInput
            value={studentId}
            onChangeText={setStudentId}
            placeholder={t.studentId}
            placeholderTextColor="#9AA6B6"
            style={styles.textInput}
            autoCapitalize="characters"
            returnKeyType="next"
          />
          <Text style={styles.fieldLabel}>{t.email}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t.email}
            placeholderTextColor="#9AA6B6"
            style={styles.textInput}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="done"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Pressable onPress={() => void saveStudent()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t.save}</Text>
          </Pressable>
          <Pressable
            onPress={goBack}
            style={styles.cancelButton}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButtonText}>{t.cancel}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.statusBarSpacer} />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : loadFailed ? (
          <View style={styles.emptyState}>
            <Text style={styles.errorText}>{t.loadError}</Text>
          </View>
        ) : screen === 'detail' ? (
          renderDetail()
        ) : screen === 'form' ? (
          renderForm()
        ) : (
          renderList()
        )}
      </View>
      <NativeStatusBar barStyle="dark-content" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  statusBarSpacer: { height: Platform.OS === 'android' ? 4 : 0 },
  container: { flex: 1, paddingHorizontal: 22, backgroundColor: palette.background },
  flex: { flex: 1 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 18,
    paddingBottom: 28,
  },
  eyebrow: { color: palette.muted, fontSize: 13, fontWeight: '500', marginBottom: 5 },
  appTitle: { color: palette.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  languageBadge: {
    backgroundColor: palette.white,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  languageBadgeText: { color: palette.primary, fontWeight: '800', fontSize: 12 },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  sectionTitle: { color: palette.ink, fontSize: 21, fontWeight: '800' },
  sectionSubtitle: { color: palette.muted, fontSize: 13, marginTop: 4 },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.primary,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addButtonPlus: { color: palette.white, fontSize: 19, fontWeight: '400', lineHeight: 20 },
  addButtonText: { color: palette.white, fontSize: 13, fontWeight: '700' },
  searchBox: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 15,
    backgroundColor: palette.white,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 13,
  },
  searchIcon: { color: palette.muted, fontSize: 26, lineHeight: 28, marginRight: 8 },
  searchInput: { flex: 1, color: palette.ink, fontSize: 14, paddingVertical: 0 },
  clearSearch: { color: palette.muted, fontSize: 22, paddingLeft: 10 },
  studentList: { paddingBottom: 24, gap: 11 },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pressed: { opacity: 0.78 },
  avatar: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCE7FF',
  },
  avatarPlaceholder: { borderWidth: 0 },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { color: palette.primary, fontWeight: '800' },
  studentSummary: { flex: 1, marginLeft: 13 },
  studentName: { color: palette.ink, fontWeight: '700', fontSize: 15, marginBottom: 4 },
  studentMeta: { color: palette.primary, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  studentEmail: { color: palette.muted, fontSize: 12 },
  chevron: { color: '#A3AFC0', fontSize: 29, marginLeft: 8, marginTop: -3 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 25 },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: palette.paleBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyIconText: { color: palette.primary, fontSize: 37 },
  emptyTitle: { color: palette.ink, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  emptyBody: { color: palette.muted, textAlign: 'center', lineHeight: 20, fontSize: 14 },
  pageHeader: {
    flexDirection: 'row',
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', minWidth: 72 },
  backArrow: { color: palette.primary, fontSize: 30, lineHeight: 32, marginRight: 2 },
  backText: { color: palette.primary, fontWeight: '600', fontSize: 14 },
  pageHeaderTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 72 },
  detailContent: { paddingTop: 13, paddingBottom: 30 },
  profileHero: { alignItems: 'center', paddingVertical: 19 },
  profileName: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 15,
    textAlign: 'center',
  },
  studentIdBadge: {
    backgroundColor: palette.paleBlue,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 13,
    marginTop: 9,
  },
  studentIdBadgeText: { color: palette.primary, fontWeight: '700', fontSize: 12 },
  infoCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    paddingHorizontal: 17,
    paddingVertical: 17,
    marginTop: 13,
    borderColor: palette.border,
    borderWidth: 1,
  },
  infoLabel: { color: palette.muted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  infoValue: { color: palette.ink, fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: 15 },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 51,
    borderRadius: 13,
    backgroundColor: palette.primary,
    marginTop: 21,
  },
  primaryButtonText: { color: palette.white, fontWeight: '700', fontSize: 15 },
  deleteButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 5 },
  deleteButtonText: { color: palette.danger, fontWeight: '700', fontSize: 14 },
  formContent: { paddingTop: 11, paddingBottom: 30 },
  formIntro: { color: palette.muted, fontSize: 13, lineHeight: 19, marginBottom: 15 },
  photoSection: { alignItems: 'center', marginBottom: 15 },
  photoButton: {
    backgroundColor: palette.paleBlue,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 11,
  },
  photoButtonText: { color: palette.primary, fontWeight: '700', fontSize: 13 },
  fieldLabel: { color: palette.ink, fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  textInput: {
    minHeight: 49,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 14,
  },
  errorText: { color: palette.danger, fontSize: 13, marginTop: 12, lineHeight: 19 },
  cancelButton: { alignItems: 'center', justifyContent: 'center', minHeight: 46, marginTop: 4 },
  cancelButtonText: { color: palette.muted, fontWeight: '600', fontSize: 14 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default App;
