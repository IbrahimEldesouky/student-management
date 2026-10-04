"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AttendanceReportPage() {
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const arabicDays = {
    0: "الأحد",
    1: "الاثنين",
    2: "الثلاثاء",
    3: "الأربعاء",
    4: "الخميس",
    5: "الجمعة",
    6: "السبت",
  };

  // تحويل أسماء الأيام إلى أرقام
  const getDayNumber = function (day) {
    if (typeof day === "number") {
      return day;
    }

    if (!day) {
      return null;
    }

    let normalized = String(day)
      .trim()
      .toLowerCase();

    normalized = normalized
      .replace(/[،]/g, ",")
      .replace(/\s+/g, " ");

    const dayMap = {
      الأحد: 0,
      الاحد: 0,

      الاثنين: 1,
      الاتنين: 1,
      الإثنين: 1,

      الثلاثاء: 2,

      الأربعاء: 3,
      الاربعاء: 3,

      الخميس: 4,

      الجمعة: 5,

      السبت: 6,

      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    if (
      Object.prototype.hasOwnProperty.call(
        dayMap,
        normalized
      )
    ) {
      return dayMap[normalized];
    }

    return null;
  };

  // استخراج أيام التدريب مهما كانت طريقة تخزينها
  const getTrainingDaysArray = function () {
    if (!selectedGroup) {
      return [];
    }

    const rawTrainingDays =
      selectedGroup.trainingDays;

    if (!rawTrainingDays) {
      return [];
    }

    let days = [];

    if (Array.isArray(rawTrainingDays)) {
      days = rawTrainingDays;
    } else if (typeof rawTrainingDays === "string") {
      days = rawTrainingDays
        .replace(/[،]/g, ",")
        .replace(/ و /g, ",")
        .replace(/وال/g, ",")
        .replace(/,/g, ",")
        .split(",")
        .map(function (item) {
          return item.trim();
        })
        .filter(function (item) {
          return item !== "";
        });
    }

    const numbers = [];

    days.forEach(function (day) {
      const number = getDayNumber(day);

      if (
        number !== null &&
        !numbers.includes(number)
      ) {
        numbers.push(number);
      }
    });

    return numbers.sort();
  };

  // تحميل المجموعات
  const loadGroups = async () => {
    try {
      setLoadingGroups(true);
      setErrorMessage("");

      const snapshot = await getDocs(
        collection(db, "groups")
      );

      const groupsData = snapshot.docs
        .map(function (item) {
          return {
            id: item.id,
            ...item.data(),
          };
        })
        .filter(function (group) {
          return group.status !== "inactive";
        })
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
      setLoadingGroups(false);
    }
  };

  // تحميل التقرير
  const loadReport = async () => {
    if (!selectedGroupId || !selectedMonth) {
      setStudents([]);
      setAttendanceRecords([]);
      return;
    }

    try {
      setLoadingReport(true);
      setErrorMessage("");

      // تحميل طلاب المجموعة
      const studentsQuery = query(
        collection(db, "students"),
        where("groupId", "==", selectedGroupId)
      );

      const studentsSnapshot = await getDocs(
        studentsQuery
      );

      const studentsData = studentsSnapshot.docs
        .map(function (item) {
          return {
            id: item.id,
            ...item.data(),
          };
        })
        .filter(function (student) {
          return student.status !== "inactive";
        })
        .sort(function (a, b) {
          return (a.name || "").localeCompare(
            b.name || "",
            "ar"
          );
        });

      setStudents(studentsData);

      // بداية الشهر
      const monthStart =
        selectedMonth + "-01";

      // بداية الشهر التالي
      const nextMonthDate = new Date(
        Number(selectedMonth.slice(0, 4)),
        Number(selectedMonth.slice(5, 7)),
        1
      );

      const nextMonthYear =
        nextMonthDate.getFullYear();

      const nextMonthMonth = String(
        nextMonthDate.getMonth() + 1
      ).padStart(2, "0");

      const monthEnd =
        nextMonthYear +
        "-" +
        nextMonthMonth +
        "-01";

      // تحميل الحضور
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("groupId", "==", selectedGroupId)
      );

      const attendanceSnapshot =
        await getDocs(attendanceQuery);

      const attendanceData =
        attendanceSnapshot.docs
          .map(function (item) {
            return {
              id: item.id,
              ...item.data(),
            };
          })
          .filter(function (record) {
            return (
              record.date >= monthStart &&
              record.date < monthEnd
            );
          })
          .sort(function (a, b) {
            return (a.date || "").localeCompare(
              b.date || ""
            );
          });

      setAttendanceRecords(attendanceData);
    } catch (error) {
      console.error(
        "LOAD REPORT ERROR:",
        error
      );

      const message =
        "كود الخطأ: " +
        (error.code || "غير معروف") +
        "\nالرسالة: " +
        (error.message || "غير معروفة");

      setErrorMessage(message);

      setStudents([]);
      setAttendanceRecords([]);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(function () {
    loadGroups();
  }, []);

  useEffect(
    function () {
      loadReport();
    },
    [selectedGroupId, selectedMonth]
  );

  const selectedGroup = groups.find(
    function (group) {
      return group.id === selectedGroupId;
    }
  );

  // أيام تدريب المجموعة
  const trainingDayNumbers =
    getTrainingDaysArray();

  // إنشاء جميع أيام التدريب المتوقعة في الشهر
  const getExpectedTrainingDates =
    function () {
      if (
        !selectedGroup ||
        !selectedMonth
      ) {
        return [];
      }

      if (
        trainingDayNumbers.length === 0
      ) {
        return [];
      }

      const year = Number(
        selectedMonth.slice(0, 4)
      );

      const month = Number(
        selectedMonth.slice(5, 7)
      );

      const daysInMonth =
        new Date(
          year,
          month,
          0
        ).getDate();

      const dates = [];

      for (
        let day = 1;
        day <= daysInMonth;
        day++
      ) {
        const date = new Date(
          year,
          month - 1,
          day
        );

        const dayNumber =
          date.getDay();

        if (
          trainingDayNumbers.includes(
            dayNumber
          )
        ) {
          const dateString =
            year +
            "-" +
            String(month).padStart(2, "0") +
            "-" +
            String(day).padStart(2, "0");

          dates.push(dateString);
        }
      }

      return dates;
    };

  const reportDates =
    getExpectedTrainingDates();

  // تاريخ اليوم بصيغة YYYY-MM-DD
  const getTodayString = function () {
    const today = new Date();

    const year =
      today.getFullYear();

    const month = String(
      today.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      today.getDate()
    ).padStart(2, "0");

    return (
      year +
      "-" +
      month +
      "-" +
      day
    );
  };

  const todayString =
    getTodayString();

  // حالة التاريخ
  const getDateState = function (
    date
  ) {
    if (date > todayString) {
      return "future";
    }

    if (date === todayString) {
      return "today";
    }

    return "past";
  };

  // اسم اليوم
  const getDayName = function (
    dateString
  ) {
    const parts =
      dateString.split("-");

    if (parts.length !== 3) {
      return "";
    }

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return arabicDays[
      date.getDay()
    ];
  };

  // البحث عن سجل طالب في يوم معين
  const getAttendanceRecord =
    function (
      studentId,
      date
    ) {
      return attendanceRecords.find(
        function (record) {
          return (
            record.studentId ===
              studentId &&
            record.date === date
          );
        }
      );
    };

  // إحصائيات الطالب
  const getStudentStats =
    function (studentId) {
      const studentRecords =
        attendanceRecords.filter(
          function (record) {
            return (
              record.studentId ===
              studentId
            );
          }
        );

      const present =
        studentRecords.filter(
          function (record) {
            return (
              record.status ===
              "present"
            );
          }
        ).length;

      const absent =
        studentRecords.filter(
          function (record) {
            return (
              record.status ===
              "absent"
            );
          }
        ).length;

      const total =
        present + absent;

      const percentage =
        total > 0
          ? Math.round(
              (present / total) *
                100
            )
          : 0;

      return {
        total: total,
        present: present,
        absent: absent,
        percentage: percentage,
      };
    };

  // تحويل الأرقام العربية والفارسية إلى أرقام إنجليزية
  const convertArabicDigits =
    function (value) {
      if (!value) {
        return "";
      }

      return String(value)
        .replace(/[٠-٩]/g, function (digit) {
          return String(
            "٠١٢٣٤٥٦٧٨٩".indexOf(
              digit
            )
          );
        })
        .replace(/[۰-۹]/g, function (digit) {
          return String(
            "۰۱۲۳۴۵۶۷۸۹".indexOf(
              digit
            )
          );
        });
    };

  // تحويل رقم الهاتف المصري إلى صيغة WhatsApp
  //
  // النظام عندنا يخزن أرقام أولياء الأمور
  // بدون الصفر الأول، أي 10 أرقام:
  // 1038420020
  //
  // ويتم تحويله إلى:
  // 201038420020
  const normalizeEgyptianPhone =
    function (phone) {
      if (!phone) {
        return "";
      }

      let cleanPhone =
        convertArabicDigits(
          phone
        ).replace(
          /\D/g,
          ""
        );

      if (!cleanPhone) {
        return "";
      }

      // 0020xxxxxxxxxx
      if (
        cleanPhone.startsWith(
          "0020"
        )
      ) {
        cleanPhone =
          cleanPhone.substring(2);
      }

      // 20xxxxxxxxxx
      if (
        cleanPhone.startsWith(
          "20"
        )
      ) {
        return cleanPhone;
      }

      // رقم مخزن 10 أرقام بدون الصفر الأول
      // مثال:
      // 1038420020
      // يصبح:
      // 201038420020
      if (
        cleanPhone.length === 10
      ) {
        return "20" + cleanPhone;
      }

      // رقم مصري عادي 11 رقم يبدأ بـ 01
      // مثال:
      // 01038420020
      // يصبح:
      // 201038420020
      if (
        cleanPhone.length === 11 &&
        cleanPhone.startsWith("0")
      ) {
        return (
          "20" +
          cleanPhone.substring(1)
        );
      }

      return cleanPhone;
    };

  // التحقق من أن الرقم أصبح رقم موبايل مصري صالح لواتساب
  const isValidEgyptianPhone =
    function (phone) {
      if (!phone) {
        return false;
      }

      return /^20(10|11|12|15)\d{8}$/.test(
        phone
      );
    };

  // إرسال تقرير الحضور عبر WhatsApp
  const openWhatsApp =
    function (student) {
      const originalPhone =
        student.guardianPhone || "";

      const phone =
        normalizeEgyptianPhone(
          originalPhone
        );

      if (!phone) {
        alert(
          "لا يوجد رقم هاتف مسجل لولي أمر الطالب " +
            student.name
        );
        return;
      }

      if (
        !isValidEgyptianPhone(
          phone
        )
      ) {
        alert(
          "رقم ولي أمر الطالب " +
            student.name +
            " غير صالح لواتساب.\n\n" +
            "الرقم المسجل: " +
            originalPhone +
            "\n\n" +
            "النظام يتوقع رقم موبايل مصري صحيح.\n" +
            "مثال عند التخزين بدون الصفر الأول:\n" +
            "1038420020"
        );
        return;
      }

      const stats =
        getStudentStats(
          student.id
        );

      const monthName =
        getMonthName(
          selectedMonth
        );

      let message =
        "السلام عليكم ورحمة الله وبركاته\n\n" +
        "ولي أمر الطالب / " +
        student.name +
        "\n\n" +
        "نحيط سيادتكم علمًا بتقرير حضور الطالب خلال شهر " +
        monthName +
        ".\n\n" +
        "المجموعة: " +
        (selectedGroup?.name || "-") +
        "\n" +
        "عدد مرات الحضور: " +
        stats.present +
        "\n" +
        "عدد مرات الغياب: " +
        stats.absent +
        "\n" +
        "إجمالي مرات التسجيل: " +
        stats.total +
        "\n" +
        "نسبة الحضور: " +
        stats.percentage +
        "%\n\n";

      if (
        stats.total === 0
      ) {
        message +=
          "لم يتم تسجيل حضور أو غياب للطالب خلال هذا الشهر.\n\n";
      } else if (
        stats.percentage >= 80
      ) {
        message +=
          "نشكر لكم اهتمامكم وحرصكم على انتظام الطالب في الدرس.\n\n";
      } else {
        message +=
          "نرجو من سيادتكم الاهتمام بانتظام الطالب في مواعيد الحصص والحرص على الحضور.\n\n";
      }

      message +=
        "مع تحياتي د. ابراهيم الدسوقي .";

      const whatsappUrl =
        "https://wa.me/" +
        phone +
        "?text=" +
        encodeURIComponent(
          message
        );

      window.open(
        whatsappUrl,
        "_blank"
      );
    };

  // إجمالي الحضور
  const totalPresent =
    attendanceRecords.filter(
      function (record) {
        return (
          record.status ===
          "present"
        );
      }
    ).length;

  // إجمالي الغياب
  const totalAbsent =
    attendanceRecords.filter(
      function (record) {
        return (
          record.status ===
          "absent"
        );
      }
    ).length;

  const totalRecords =
    totalPresent +
    totalAbsent;

  const groupPercentage =
    totalRecords > 0
      ? Math.round(
          (totalPresent /
            totalRecords) *
            100
        )
      : 0;

  // إجمالي أيام التدريب
  const totalExpectedSessions =
    reportDates.length;

  // الأيام التي وصلت بالفعل
  const completedExpectedSessions =
    reportDates.filter(
      function (date) {
        return (
          date <= todayString
        );
      }
    ).length;

  // الأيام القادمة
  const futureSessions =
    reportDates.filter(
      function (date) {
        return (
          date > todayString
        );
      }
    ).length;

  // الأيام التي وصلت بالفعل وتم تسجيلها
  const recordedDates =
    Array.from(
      new Set(
        attendanceRecords.map(
          function (record) {
            return record.date;
          }
        )
      )
    );

  const unrecordedPastSessions =
    reportDates.filter(
      function (date) {
        return (
          date < todayString
        );
      }
    ).filter(
      function (date) {
        return !recordedDates.includes(
          date
        );
      }
    ).length;

  // اسم الشهر
  const getMonthName =
    function (monthValue) {
      if (!monthValue) {
        return "";
      }

      const parts =
        monthValue.split("-");

      if (parts.length !== 2) {
        return monthValue;
      }

      const monthNumber =
        Number(parts[1]);

      const monthNames = [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "مايو",
        "يونيو",
        "يوليو",
        "أغسطس",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
      ];

      return (
        monthNames[
          monthNumber - 1
        ] +
        " " +
        parts[0]
      );
    };

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 p-6"
    >
      <div className="mx-auto max-w-7xl">

        {/* العنوان */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <button
            type="button"
            onClick={function () {
              router.push(
                "/dashboard"
              );
            }}
            className="mb-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← العودة للوحة التحكم
          </button>

          <h1 className="text-2xl font-bold text-slate-800">
            تقرير الحضور الشهري
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            متابعة حضور وغياب طلاب المجموعة خلال الشهر
          </p>

        </div>

        {/* الخطأ */}
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

        {/* الفلاتر */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

          <div className="grid gap-5 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                المجموعة
              </label>

              {loadingGroups ? (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  جاري تحميل المجموعات...
                </div>
              ) : (
                <select
                  value={
                    selectedGroupId
                  }
                  onChange={function (
                    e
                  ) {
                    setSelectedGroupId(
                      e.target.value
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
                >

                  <option value="">
                    اختر المجموعة
                  </option>

                  {groups.map(
                    function (
                      group
                    ) {
                      return (
                        <option
                          key={
                            group.id
                          }
                          value={
                            group.id
                          }
                        >
                          {
                            group.name
                          }
                        </option>
                      );
                    }
                  )}

                </select>
              )}

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium text-slate-700">
                الشهر
              </label>

              <input
                type="month"
                value={
                  selectedMonth
                }
                onChange={function (
                  e
                ) {
                  setSelectedMonth(
                    e.target.value
                  );
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white"
              />

            </div>

          </div>

          {selectedGroup && (
            <div className="mt-5 rounded-xl bg-blue-50 p-4">

              <p className="text-xs font-medium text-blue-600">
                التقرير الحالي
              </p>

              <p className="mt-1 font-bold text-blue-800">
                {selectedGroup.name}
              </p>

              <p className="mt-1 text-sm text-blue-700">
                شهر{" "}
                {getMonthName(
                  selectedMonth
                )}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                  أيام التدريب:{" "}
                  {trainingDayNumbers.length >
                  0
                    ? trainingDayNumbers
                        .map(
                          function (
                            day
                          ) {
                            return (
                              arabicDays[
                                day
                              ]
                            );
                          }
                        )
                        .join(
                          " - "
                        )
                    : "غير محددة"}
                </span>

                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-700">
                  أيام التدريب المتوقعة:{" "}
                  {totalExpectedSessions}
                </span>

                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  أيام التدريب التي وصلت:{" "}
                  {
                    completedExpectedSessions
                  }
                </span>

                <span className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                  الأيام القادمة:{" "}
                  {futureSessions}
                </span>

              </div>

              {trainingDayNumbers.length ===
                0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">

                  لم يتمكن النظام من قراءة أيام التدريب
                  لهذه المجموعة.

                  <br />

                  القيمة المسجلة حاليًا:
                  <strong className="mr-1">
                    {Array.isArray(
                      selectedGroup.trainingDays
                    )
                      ? selectedGroup.trainingDays.join(
                          " - "
                        )
                      : String(
                          selectedGroup.trainingDays ||
                            "غير موجودة"
                        )}
                  </strong>

                </div>
              )}

            </div>
          )}

        </div>

        {/* الإحصائيات */}
        {!loadingReport &&
          selectedGroupId &&
          students.length > 0 && (

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

            <div className="rounded-2xl bg-white p-5 shadow-sm">

              <p className="text-sm text-slate-500">
                عدد الطلاب
              </p>

              <p className="mt-2 text-3xl font-bold text-slate-800">
                {students.length}
              </p>

            </div>

            <div className="rounded-2xl bg-green-50 p-5">

              <p className="text-sm text-green-600">
                إجمالي الحضور
              </p>

              <p className="mt-2 text-3xl font-bold text-green-700">
                {totalPresent}
              </p>

            </div>

            <div className="rounded-2xl bg-red-50 p-5">

              <p className="text-sm text-red-600">
                إجمالي الغياب
              </p>

              <p className="mt-2 text-3xl font-bold text-red-700">
                {totalAbsent}
              </p>

            </div>

            <div className="rounded-2xl bg-amber-50 p-5">

              <p className="text-sm text-amber-600">
                لم يسجل
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-700">
                {
                  unrecordedPastSessions
                }
              </p>

            </div>

            <div className="rounded-2xl bg-blue-50 p-5">

              <p className="text-sm text-blue-600">
                نسبة حضور المجموعة
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-700">
                {groupPercentage}%
              </p>

            </div>

          </div>
        )}

        {/* التقرير */}
        <div className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-100 p-6">

            <h2 className="text-lg font-bold text-slate-800">
              تفاصيل الحضور
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              جميع أيام تدريب المجموعة خلال الشهر تظهر هنا، سواء تم تسجيل الحضور لها أم لا
            </p>

          </div>

          {loadingReport ? (
            <div className="p-10 text-center text-slate-500">
              جاري إعداد التقرير...
            </div>
          ) : !selectedGroupId ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-4xl">
                📊
              </div>

              <h3 className="font-bold text-slate-700">
                اختر المجموعة
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                اختر المجموعة والشهر لعرض التقرير
              </p>

            </div>
          ) : students.length === 0 ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-4xl">
                👨‍🎓
              </div>

              <h3 className="font-bold text-slate-700">
                لا يوجد طلاب
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                لا يوجد طلاب مسجلون في هذه المجموعة
              </p>

            </div>
          ) : reportDates.length === 0 ? (
            <div className="p-10 text-center">

              <div className="mb-3 text-5xl">
                📅
              </div>

              <h3 className="font-bold text-slate-700">
                لم يتم تحديد أيام التدريب
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                يوجد طلاب في المجموعة، لكن النظام لم يتعرف على أيام التدريب الخاصة بها.
              </p>

              <button
                type="button"
                onClick={function () {
                  router.push(
                    "/dashboard/groups"
                  );
                }}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                مراجعة بيانات المجموعة
              </button>

            </div>
          ) : (
            <>

              {/* ملخص أيام التدريب */}
              <div className="border-b border-slate-100 bg-slate-50 p-5">

                <div className="flex flex-wrap gap-3 text-sm">

                  <span className="rounded-xl bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm">
                    إجمالي أيام التدريب:{" "}
                    {
                      totalExpectedSessions
                    }
                  </span>

                  <span className="rounded-xl bg-white px-4 py-2 font-semibold text-green-700 shadow-sm">
                    أيام وصلت:{" "}
                    {
                      completedExpectedSessions
                    }
                  </span>

                  <span className="rounded-xl bg-white px-4 py-2 font-semibold text-blue-700 shadow-sm">
                    أيام قادمة:{" "}
                    {futureSessions}
                  </span>

                  <span className="rounded-xl bg-white px-4 py-2 font-semibold text-amber-700 shadow-sm">
                    أيام لم يسجل لها حضور:{" "}
                    {
                      unrecordedPastSessions
                    }
                  </span>

                </div>

              </div>

              {/* جدول التقرير */}
              <div className="overflow-x-auto">

                <table className="w-full min-w-[1450px] text-right">

                  <thead className="bg-slate-50">

                    <tr>

                      <th className="sticky right-0 z-10 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
                        #
                      </th>

                      <th className="sticky right-12 z-10 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-600">
                        اسم الطالب
                      </th>

                      {reportDates.map(
                        function (
                          date
                        ) {

                          const state =
                            getDateState(
                              date
                            );

                          return (
                            <th
                              key={date}
                              className="px-4 py-4 text-center text-xs font-semibold text-slate-600"
                            >

                              <div>
                                {
                                  date.slice(
                                    8,
                                    10
                                  )
                                }
                                /
                                {
                                  date.slice(
                                    5,
                                    7
                                  )
                                }
                              </div>

                              <div className="mt-1 text-[10px] text-slate-400">
                                {
                                  getDayName(
                                    date
                                  )
                                }
                              </div>

                              {state ===
                                "future" && (
                                <div className="mt-1 text-[9px] font-bold text-blue-500">
                                  قادم
                                </div>
                              )}

                              {state ===
                                "today" && (
                                <div className="mt-1 text-[9px] font-bold text-amber-600">
                                  اليوم
                                </div>
                              )}

                            </th>
                          );
                        }
                      )}

                      <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                        الحضور
                      </th>

                      <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                        الغياب
                      </th>

                      <th className="px-5 py-4 text-sm font-semibold text-slate-600">
                        النسبة
                      </th>

                      <th className="px-5 py-4 text-center text-sm font-semibold text-green-700">
                        WhatsApp
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {students.map(
                      function (
                        student,
                        index
                      ) {

                        const stats =
                          getStudentStats(
                            student.id
                          );

                        return (
                          <tr
                            key={
                              student.id
                            }
                            className="border-t border-slate-100 hover:bg-slate-50"
                          >

                            <td className="sticky right-0 z-10 bg-white px-5 py-4 text-sm text-slate-500">
                              {index + 1}
                            </td>

                            <td className="sticky right-12 z-10 bg-white px-5 py-4 font-semibold text-slate-800">
                              {
                                student.name
                              }
                            </td>

                            {reportDates.map(
                              function (
                                date
                              ) {

                                const record =
                                  getAttendanceRecord(
                                    student.id,
                                    date
                                  );

                                const state =
                                  getDateState(
                                    date
                                  );

                                return (
                                  <td
                                    key={
                                      date
                                    }
                                    className="px-4 py-4 text-center"
                                  >

                                    {record ? (
                                      record.status ===
                                      "present" ? (
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                                          ✓
                                        </span>
                                      ) : (
                                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 font-bold text-red-700">
                                          ✕
                                        </span>
                                      )
                                    ) : state ===
                                      "future" ? (
                                      <span className="inline-flex rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-500">
                                        قادم
                                      </span>
                                    ) : state ===
                                      "today" ? (
                                      <span className="inline-flex rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-600">
                                        لم يسجل
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
                                        لم يسجل
                                      </span>
                                    )}

                                  </td>
                                );
                              }
                            )}

                            <td className="px-5 py-4 font-bold text-green-700">
                              {
                                stats.present
                              }
                            </td>

                            <td className="px-5 py-4 font-bold text-red-700">
                              {
                                stats.absent
                              }
                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={
                                  stats.percentage >=
                                  80
                                    ? "rounded-lg bg-green-50 px-3 py-1 text-sm font-bold text-green-700"
                                    : stats.percentage >=
                                      60
                                    ? "rounded-lg bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700"
                                    : "rounded-lg bg-red-50 px-3 py-1 text-sm font-bold text-red-700"
                                }
                              >
                                {
                                  stats.percentage
                                }
                                %
                              </span>

                            </td>

                            {/* WhatsApp */}
                            <td className="px-5 py-4 text-center">

                              <button
                                type="button"
                                onClick={function () {
                                  openWhatsApp(
                                    student
                                  );
                                }}
                                className="rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                              >
                                📱 إرسال التقرير
                              </button>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>

                </table>

              </div>

              {/* مفتاح الحالات */}
              <div className="border-t border-slate-100 p-6">

                <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600">

                  <div className="flex items-center gap-2">

                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 font-bold text-green-700">
                      ✓
                    </span>

                    حاضر

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 font-bold text-red-700">
                      ✕
                    </span>

                    غائب

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
                      لم يسجل
                    </span>

                    يوم تدريب انتهى ولم يتم تسجيل الحضور

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-500">
                      قادم
                    </span>

                    يوم تدريب لم يأتِ بعد

                  </div>

                  <div className="flex items-center gap-2">

                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600">
                      اليوم
                    </span>

                    يوم التدريب الحالي

                  </div>

                </div>

              </div>

            </>
          )}

        </div>

      </div>
    </main>
  );
}