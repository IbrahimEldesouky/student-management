"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AttendancePage() {
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [attendance, setAttendance] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [attendanceSaved, setAttendanceSaved] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // أسماء أيام الأسبوع بالعربي
  const arabicDays = {
    0: "الأحد",
    1: "الاثنين",
    2: "الثلاثاء",
    3: "الأربعاء",
    4: "الخميس",
    5: "الجمعة",
    6: "السبت",
  };

  // أسماء الأيام بالإنجليزي
  const englishDays = {
    0: ["sunday", "sun"],
    1: ["monday", "mon"],
    2: ["tuesday", "tue", "tues"],
    3: ["wednesday", "wed"],
    4: ["thursday", "thu", "thur", "thurs"],
    5: ["friday", "fri"],
    6: ["saturday", "sat"],
  };

  // الحصول على رقم اليوم من التاريخ
  const getDayNumberFromDate = (dateString) => {
    if (!dateString) {
      return null;
    }

    const parts = dateString.split("-");

    if (parts.length !== 3) {
      return null;
    }

    const year = Number(parts[0]);
    const month = Number(parts[1]) - 1;
    const day = Number(parts[2]);

    const date = new Date(year, month, day);

    return date.getDay();
  };

  // اسم اليوم بالعربي
  const getArabicDayName = (dateString) => {
    const dayNumber = getDayNumberFromDate(dateString);

    if (dayNumber === null) {
      return "";
    }

    return arabicDays[dayNumber];
  };

  // التحقق هل التاريخ من أيام تدريب المجموعة
  const isTrainingDay = () => {
    if (!selectedGroup || !selectedDate) {
      return false;
    }

    if (
      !selectedGroup.trainingDays ||
      !Array.isArray(selectedGroup.trainingDays) ||
      selectedGroup.trainingDays.length === 0
    ) {
      return false;
    }

    const dayNumber = getDayNumberFromDate(selectedDate);

    if (dayNumber === null) {
      return false;
    }

    const selectedDayArabic = arabicDays[dayNumber];
    const selectedDayEnglish = englishDays[dayNumber];

    return selectedGroup.trainingDays.some(function (trainingDay) {
      const savedDay = String(trainingDay || "")
        .trim()
        .toLowerCase();

      const arabicMatch =
        savedDay === selectedDayArabic.toLowerCase();

      const englishMatch =
        selectedDayEnglish.indexOf(savedDay) !== -1;

      return arabicMatch || englishMatch;
    });
  };

  // تحميل المجموعات
  const loadGroups = async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const snapshot = await getDocs(collection(db, "groups"));

      const groupsData = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .filter((group) => group.status !== "inactive")
        .sort(function (a, b) {
          return (a.name || "").localeCompare(
            b.name || "",
            "ar"
          );
        });

      setGroups(groupsData);

      if (groupsData.length > 0 && !selectedGroupId) {
        setSelectedGroupId(groupsData[0].id);
      }
    } catch (error) {
      console.error("LOAD GROUPS ERROR:", error);

      const message =
        "كود الخطأ: " +
        (error.code || "غير معروف") +
        "\nالرسالة: " +
        (error.message || "غير معروفة");

      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  // تحميل الطلاب
  const loadStudents = async (groupId) => {
    if (!groupId) {
      setStudents([]);
      return;
    }

    try {
      setLoadingStudents(true);
      setErrorMessage("");
      setAttendanceSaved(false);

      const studentsQuery = query(
        collection(db, "students"),
        where("groupId", "==", groupId),
        where("status", "==", "active")
      );

      const snapshot = await getDocs(studentsQuery);

      const studentsData = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data(),
        }))
        .sort(function (a, b) {
          return (a.name || "").localeCompare(
            b.name || "",
            "ar"
          );
        });

      setStudents(studentsData);

      const defaultAttendance = {};

      studentsData.forEach(function (student) {
        defaultAttendance[student.id] = "present";
      });

      setAttendance(defaultAttendance);
    } catch (error) {
      console.error("LOAD STUDENTS ERROR:", error);

      const message =
        "كود الخطأ: " +
        (error.code || "غير معروف") +
        "\nالرسالة: " +
        (error.message || "غير معروفة");

      setErrorMessage(message);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(function () {
    loadGroups();
  }, []);

  useEffect(
    function () {
      if (selectedGroupId) {
        loadStudents(selectedGroupId);
      }
    },
    [selectedGroupId]
  );

  // تغيير التاريخ
  const handleDateChange = (value) => {
    setSelectedDate(value);
    setAttendanceSaved(false);
  };

  // تغيير المجموعة
  const handleGroupChange = (value) => {
    setSelectedGroupId(value);
    setAttendanceSaved(false);
  };

  // تغيير حالة الطالب
  const changeAttendance = (studentId, status) => {
    setAttendanceSaved(false);

    setAttendance(function (previous) {
      return {
        ...previous,
        [studentId]: status,
      };
    });
  };

  // الكل حاضر
  const markAllPresent = () => {
    setAttendanceSaved(false);

    const newAttendance = {};

    students.forEach(function (student) {
      newAttendance[student.id] = "present";
    });

    setAttendance(newAttendance);
  };

  // الكل غائب
  const markAllAbsent = () => {
    setAttendanceSaved(false);

    const newAttendance = {};

    students.forEach(function (student) {
      newAttendance[student.id] = "absent";
    });

    setAttendance(newAttendance);
  };

  // تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية
  const convertArabicAndPersianDigits = (value) => {
    if (!value) {
      return "";
    }

    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

    return String(value)
      .split("")
      .map(function (char) {
        const arabicIndex = arabicDigits.indexOf(char);

        if (arabicIndex !== -1) {
          return String(arabicIndex);
        }

        const persianIndex = persianDigits.indexOf(char);

        if (persianIndex !== -1) {
          return String(persianIndex);
        }

        return char;
      })
      .join("");
  };

  // تحويل رقم الهاتف للصيغة الصحيحة لـ WhatsApp
  // الأرقام المخزنة في النظام عادةً:
  // 1012345678
  // 1112345678
  // 1212345678
  // 1512345678
  //
  // وتتحول إلى:
  // 201012345678
  // 201112345678
  // 201212345678
  // 201512345678
  const normalizeEgyptianPhone = (phone) => {
    if (!phone) {
      return "";
    }

    let cleanPhone = convertArabicAndPersianDigits(phone);

    cleanPhone = cleanPhone.replace(/\D/g, "");

    // إزالة 00 من بداية الرقم الدولي
    if (cleanPhone.startsWith("00")) {
      cleanPhone = cleanPhone.substring(2);
    }

    // لو الرقم مكتوب بصيغة دولية مصرية
    if (
      cleanPhone.length === 12 &&
      cleanPhone.startsWith("20")
    ) {
      return /^20(10|11|12|15)\d{8}$/.test(cleanPhone)
        ? cleanPhone
        : "";
    }

    // لو الرقم 10 أرقام بدون الصفر
    // مثال: 1012345678
    if (
      cleanPhone.length === 10 &&
      /^(10|11|12|15)\d{8}$/.test(cleanPhone)
    ) {
      return "20" + cleanPhone;
    }

    // لو الرقم 11 رقم ويبدأ بصفر
    // مثال: 01012345678
    if (
      cleanPhone.length === 11 &&
      /^0(10|11|12|15)\d{8}$/.test(cleanPhone)
    ) {
      return "20" + cleanPhone.substring(1);
    }

    // لو الرقم يبدأ بعلامة + وتم تنظيفها بالفعل
    // يتم التحقق من الرقم الدولي
    if (
      cleanPhone.length === 12 &&
      /^20(10|11|12|15)\d{8}$/.test(cleanPhone)
    ) {
      return cleanPhone;
    }

    return "";
  };

  // فتح WhatsApp برسالة جاهزة
  const openWhatsApp = (student) => {
    const phone = normalizeEgyptianPhone(
      student.guardianPhone
    );

    if (!phone) {
      alert(
        "رقم ولي أمر الطالب " +
          student.name +
          " غير صالح لواتساب.\n\n" +
          "الرقم المسجل: " +
          (student.guardianPhone || "غير موجود") +
          "\n\n" +
          "يجب تسجيل رقم الموبايل المصري 10 أرقام بدون الصفر، مثل:\n" +
          "1012345678"
      );
      return;
    }

    const studentStatus =
      attendance[student.id] || "present";

    const statusText =
      studentStatus === "present"
        ? "حضر"
        : "لم يحضر";

    const dateParts = selectedDate.split("-");

    const formattedDate =
      dateParts.length === 3
        ? dateParts[2] +
          "/" +
          dateParts[1] +
          "/" +
          dateParts[0]
        : selectedDate;

    const message =
      "السلام عليكم ورحمة الله وبركاته\n\n" +
      "ولي أمر الطالب / " +
      student.name +
      "\n\n" +
      "نحيط سيادتكم علمًا بأن الطالب " +
      statusText +
      " حصة اليوم " +
      getArabicDayName(selectedDate) +
      " الموافق " +
      formattedDate +
      ".\n\n" +
      "المجموعة: " +
      (selectedGroup?.name || "-") +
      "\n\n" +
      "شكرًا لتعاونكم وحرصكم على انتظام الطالب.\n" +
      "مع تحياتي د. ابراهيم الدسوقي.";

    const whatsappUrl =
      "https://wa.me/" +
      phone +
      "?text=" +
      encodeURIComponent(message);

    window.open(whatsappUrl, "_blank");
  };

  // حفظ الحضور
  const handleSaveAttendance = async () => {
    if (!selectedGroupId) {
      alert("من فضلك اختر المجموعة");
      return;
    }

    if (!selectedDate) {
      alert("من فضلك اختر التاريخ");
      return;
    }

    if (!isTrainingDay()) {
      alert(
        "هذا التاريخ ليس من أيام تدريب المجموعة.\n\n" +
          "اليوم المختار: " +
          getArabicDayName(selectedDate) +
          "\n" +
          "أيام تدريب المجموعة: " +
          (selectedGroup.trainingDays || []).join(" - ")
      );
      return;
    }

    if (students.length === 0) {
      alert("لا يوجد طلاب نشطون في هذه المجموعة");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");

      const attendanceQuery = query(
        collection(db, "attendance"),
        where("groupId", "==", selectedGroupId),
        where("date", "==", selectedDate)
      );

      const existingSnapshot = await getDocs(
        attendanceQuery
      );

      if (!existingSnapshot.empty) {
        alert(
          "تم تسجيل حضور هذه المجموعة بالفعل في هذا التاريخ.\n\nلن يتم إنشاء سجلات مكررة."
        );

        setAttendanceSaved(true);
        setSaving(false);
        return;
      }

      for (const student of students) {
        await addDoc(collection(db, "attendance"), {
          studentId: student.id,
          studentName: student.name,
          groupId: selectedGroupId,
          date: selectedDate,
          status: attendance[student.id] || "present",
          createdAt: serverTimestamp(),
        });
      }

      setAttendanceSaved(true);

      alert(
        "تم حفظ الحضور والغياب بنجاح\n\nيمكنك الآن إرسال إشعار WhatsApp لكل ولي أمر."
      );
    } catch (error) {
      console.error("SAVE ATTENDANCE ERROR:", error);

      const message =
        "كود الخطأ: " +
        (error.code || "غير معروف") +
        "\nالرسالة: " +
        (error.message || "غير معروفة");

      setErrorMessage(message);

      alert(
        "حدث خطأ أثناء حفظ الحضور\n\n" +
          message
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedGroup = groups.find(function (group) {
    return group.id === selectedGroupId;
  });

  const trainingDay = getArabicDayName(selectedDate);
  const validTrainingDay = isTrainingDay();

  const presentCount = students.filter(function (student) {
    return attendance[student.id] === "present";
  }).length;

  const absentCount = students.filter(function (student) {
    return attendance[student.id] === "absent";
  }).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 p-6"
    >
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <button
            onClick={() => router.push("/dashboard")}
            className="mb-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← العودة للوحة التحكم
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                الحضور والغياب
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                تسجيل حضور وغياب الطلاب حسب المجموعة والتاريخ
              </p>
            </div>

            <div className="w-full lg:w-64">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                تاريخ الحضور
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) =>
                  handleDateChange(e.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
              />

            </div>

          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">

            <h2 className="mb-2 font-bold text-red-700">
              تفاصيل الخطأ
            </h2>

            <pre className="whitespace-pre-wrap text-sm leading-7 text-red-600">
              {errorMessage}
            </pre>

          </div>
        )}

        {/* اختيار المجموعة */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="grid gap-5 lg:grid-cols-3">

            <div className="lg:col-span-2">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                المجموعة
              </label>

              {loading ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  جاري تحميل المجموعات...
                </div>
              ) : (
                <select
                  value={selectedGroupId}
                  onChange={(e) =>
                    handleGroupChange(e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                >

                  <option value="">
                    اختر المجموعة
                  </option>

                  {groups.map(function (group) {
                    return (
                      <option
                        key={group.id}
                        value={group.id}
                      >
                        {group.name}
                      </option>
                    );
                  })}

                </select>
              )}

            </div>

            {/* معلومات المجموعة */}
            <div className="rounded-xl bg-blue-50 p-4">

              <p className="text-xs font-medium text-blue-600">
                المجموعة المختارة
              </p>

              <p className="mt-1 font-bold text-blue-800">
                {selectedGroup
                  ? selectedGroup.name
                  : "لم يتم الاختيار"}
              </p>

              {selectedGroup && (
                <div className="mt-2 space-y-1 text-xs text-blue-700">

                  <p>
                    أيام التدريب:{" "}
                    {selectedGroup.trainingDays &&
                    selectedGroup.trainingDays.length > 0
                      ? selectedGroup.trainingDays.join(" - ")
                      : "-"}
                  </p>

                  <p>
                    الوقت:{" "}
                    {selectedGroup.startTime || "-"}{" "}
                    {selectedGroup.endTime
                      ? "إلى " +
                        selectedGroup.endTime
                      : ""}
                  </p>

                </div>
              )}

            </div>

          </div>
        </div>

        {/* حالة يوم التدريب */}
        {selectedGroupId && selectedDate && selectedGroup && (
          <div
            className={
              validTrainingDay
                ? "mb-6 rounded-2xl border border-green-200 bg-green-50 p-5"
                : "mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"
            }
          >

            {validTrainingDay ? (
              <div className="flex items-start gap-3">

                <div className="text-2xl">
                  ✓
                </div>

                <div>

                  <h2 className="font-bold text-green-800">
                    هذا يوم تدريب للمجموعة
                  </h2>

                  <p className="mt-1 text-sm text-green-700">
                    التاريخ المختار هو يوم {trainingDay}، وهو من أيام تدريب مجموعة{" "}
                    {selectedGroup.name}.
                  </p>

                </div>

              </div>
            ) : (
              <div className="flex items-start gap-3">

                <div className="text-2xl">
                  ⚠️
                </div>

                <div>

                  <h2 className="font-bold text-amber-800">
                    لا يوجد تدريب لهذه المجموعة في هذا اليوم
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-amber-700">
                    التاريخ المختار هو يوم {trainingDay}.
                    <br />
                    أيام تدريب المجموعة هي:{" "}
                    <strong>
                      {selectedGroup.trainingDays &&
                      selectedGroup.trainingDays.length > 0
                        ? selectedGroup.trainingDays.join(" - ")
                        : "غير محددة"}
                    </strong>
                  </p>

                  <p className="mt-2 text-xs text-amber-600">
                    لن يتم السماح بحفظ سجل حضور لهذا التاريخ.
                  </p>

                </div>

              </div>
            )}

          </div>
        )}

        {/* رسالة نجاح الحفظ */}
        {attendanceSaved && validTrainingDay && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-start gap-3">

                <div className="text-2xl">
                  ✅
                </div>

                <div>
                  <h2 className="font-bold text-green-800">
                    تم حفظ حضور اليوم بنجاح
                  </h2>

                  <p className="mt-1 text-sm text-green-700">
                    يمكنك الآن إرسال إشعار WhatsApp لولي أمر كل طالب.
                  </p>
                </div>

              </div>

              <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-green-700 shadow-sm">
                {presentCount} حاضر - {absentCount} غائب
              </div>

            </div>

          </div>
        )}

        {/* الإحصائيات */}
        {selectedGroupId &&
          validTrainingDay &&
          !loadingStudents &&
          students.length > 0 && (

          <div className="mb-6 grid gap-4 sm:grid-cols-3">

            <div className="rounded-2xl bg-white p-5 shadow-sm">

              <p className="text-sm text-slate-500">
                إجمالي الطلاب
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-800">
                {students.length}
              </p>

            </div>

            <div className="rounded-2xl bg-green-50 p-5">

              <p className="text-sm text-green-600">
                الحضور
              </p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {presentCount}
              </p>

            </div>

            <div className="rounded-2xl bg-red-50 p-5">

              <p className="text-sm text-red-600">
                الغياب
              </p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {absentCount}
              </p>

            </div>

          </div>
        )}

        {/* جدول الطلاب */}
        <div className="rounded-2xl bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-bold text-slate-800">
                قائمة الطلاب
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedDate
                  ? "تسجيل حضور يوم " +
                    selectedDate +
                    " - " +
                    trainingDay
                  : "اختر التاريخ"}

              </p>

            </div>

            {students.length > 0 && validTrainingDay && (
              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={markAllPresent}
                  className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"
                >
                  ✓ الكل حاضر
                </button>

                <button
                  type="button"
                  onClick={markAllAbsent}
                  className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  ✕ الكل غائب
                </button>

              </div>
            )}

          </div>

          {loadingStudents ? (
            <div className="p-10 text-center text-slate-500">
              جاري تحميل طلاب المجموعة...
            </div>
          ) : !selectedGroupId ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-4xl">
                👥
              </div>

              <h3 className="font-bold text-slate-700">
                اختر مجموعة أولًا
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                بعد اختيار المجموعة سيظهر الطلاب المسجلون بها
              </p>

            </div>
          ) : !validTrainingDay ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-5xl">
                📅
              </div>

              <h3 className="font-bold text-slate-700">
                لا يمكن تسجيل الحضور في هذا اليوم
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
                التاريخ الذي اخترته هو يوم{" "}
                <strong className="text-slate-700">
                  {trainingDay}
                </strong>
                ، بينما أيام تدريب هذه المجموعة هي{" "}
                <strong className="text-slate-700">
                  {selectedGroup.trainingDays &&
                  selectedGroup.trainingDays.length > 0
                    ? selectedGroup.trainingDays.join(" - ")
                    : "غير محددة"}
                </strong>
                .
              </p>

              <p className="mt-3 text-xs text-slate-400">
                اختر تاريخًا يوافق أحد أيام تدريب المجموعة لتسجيل الحضور.
              </p>

            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-4xl">
                👨‍🎓
              </div>

              <h3 className="font-bold text-slate-700">
                لا يوجد طلاب نشطون
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                لا يوجد طلاب نشطون مسجلون في هذه المجموعة حاليًا
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/dashboard/students")
                }
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                الذهاب لإدارة الطلاب
              </button>

            </div>
          ) : (
            <>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-right">

                  <thead className="bg-slate-50">

                    <tr>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                        #
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                        اسم الطالب
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                        الحالة
                      </th>

                      <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                        الإجراء
                      </th>

                      {attendanceSaved && (
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">
                          WhatsApp
                        </th>
                      )}

                    </tr>

                  </thead>

                  <tbody>

                    {students.map(function (student, index) {

                      const studentStatus =
                        attendance[student.id] ||
                        "present";

                      const presentClass =
                        studentStatus === "present"
                          ? "bg-green-600 text-white"
                          : "bg-green-50 text-green-700 hover:bg-green-100";

                      const absentClass =
                        studentStatus === "absent"
                          ? "bg-red-600 text-white"
                          : "bg-red-50 text-red-700 hover:bg-red-100";

                      return (
                        <tr
                          key={student.id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >

                          <td className="px-6 py-4 text-sm text-slate-500">
                            {index + 1}
                          </td>

                          <td className="px-6 py-4 font-semibold text-slate-800">
                            {student.name}
                          </td>

                          <td className="px-6 py-4">

                            {studentStatus === "present" ? (
                              <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                حاضر
                              </span>
                            ) : (
                              <span className="rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                غائب
                              </span>
                            )}

                          </td>

                          <td className="px-6 py-4">

                            <div className="flex gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  changeAttendance(
                                    student.id,
                                    "present"
                                  )
                                }
                                className={
                                  "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                                  presentClass
                                }
                              >
                                ✓ حاضر
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  changeAttendance(
                                    student.id,
                                    "absent"
                                  )
                                }
                                className={
                                  "rounded-lg px-4 py-2 text-sm font-semibold transition " +
                                  absentClass
                                }
                              >
                                ✕ غائب
                              </button>

                            </div>

                          </td>

                          {attendanceSaved && (
                            <td className="px-6 py-4">

                              <button
                                type="button"
                                onClick={() =>
                                  openWhatsApp(student)
                                }
                                className="rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                              >
                                📱 إرسال WhatsApp
                              </button>

                            </td>
                          )}

                        </tr>
                      );
                    })}

                  </tbody>

                </table>

              </div>

              {/* حفظ الحضور */}
              <div className="border-t border-slate-100 p-6">

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="text-sm text-slate-500">

                    <span className="font-semibold text-green-600">
                      {presentCount} حاضر
                    </span>

                    <span className="mx-2">
                      |
                    </span>

                    <span className="font-semibold text-red-600">
                      {absentCount} غائب
                    </span>

                  </div>

                  <button
                    type="button"
                    onClick={handleSaveAttendance}
                    disabled={
                      saving ||
                      !validTrainingDay ||
                      attendanceSaved
                    }
                    className="rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "جاري حفظ الحضور..."
                      : attendanceSaved
                      ? "✓ تم حفظ الحضور"
                      : "حفظ الحضور والغياب"}
                  </button>

                </div>

              </div>

            </>
          )}

        </div>

      </div>
    </main>
  );
}