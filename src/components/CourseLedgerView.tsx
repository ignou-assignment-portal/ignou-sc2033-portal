import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CoursePacket } from '../types';
import { formatDate, isPracticalCourse, isDualComponentCourse } from '../utils/helpers';
import {
  Layers,
  PackageCheck,
  Send,
  UserCheck,
  PlusCircle,
  Calendar,
  AlertCircle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Download,
  Users,
  Pencil,
  Trash2,
  AlertTriangle,
  Lock,
  X,
  Filter,
  Search,
  GraduationCap,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { PacketDispatchSlipModal, ScriptEntry } from './PacketDispatchSlipModal';
import { normalizeSessionName } from '../services/sheetsService';
import {
  downloadPacketDispatchSlipPDF,
  downloadPacketLifecycleSOP_PDF,
} from '../services/pdfReportGenerator';
import {
  normalizeDiagnosticCourse,
  normalizeDiagnosticEnrollment,
} from '../utils/diagnosticConsistencyUtility';

export const CourseLedgerView: React.FC = () => {
  const {
    currentSession,
    sessionIntakes,
    sessionCourseEvaluations,
    allIntakes,
    allCourseEvaluations,
    sessionPackets,
    packets,
    evaluators,
    createPacket,
    updatePacket,
    deletePacket,
    showToast,
    isAdmin,
    reconcileIntakeAndCourseLedger,
    getCourseTitle,
    settings,
    requireEditingAuth,
  } = useApp();

  const [ledgerScope, setLedgerScope] = useState<'ALL' | 'SESSION'>('ALL');

  // Filter & Selection State
  const [filterProgramme, setFilterProgramme] = useState<string>('ALL');
  const [filterCourseCode, setFilterCourseCode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form Packet Modal State
  const [isPacketModalOpen, setIsPacketModalOpen] = useState(false);
  const [modalProgramme, setModalProgramme] = useState('');
  const [selectedCourseForPacket, setSelectedCourseForPacket] = useState('');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [scriptCountInput, setScriptCountInput] = useState<number>(20);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [packetNotes, setPacketNotes] = useState('');

  // Edit / Modify Packet Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPacket, setEditingPacket] = useState<CoursePacket | null>(null);
  const [editEvaluatorId, setEditEvaluatorId] = useState('');
  const [editScriptCount, setEditScriptCount] = useState<number>(1);
  const [editExpectedReturnDate, setEditExpectedReturnDate] = useState('');
  const [editPacketNotes, setEditPacketNotes] = useState('');
  const [editPacketStatus, setEditPacketStatus] = useState<CoursePacket['status']>('Formed');

  // Delete Packet Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [packetToDelete, setPacketToDelete] = useState<CoursePacket | null>(null);

  // Dispatch Slip Modal State
  const [isDispatchSlipOpen, setIsDispatchSlipOpen] = useState(false);
  const [selectedPacketForSlip, setSelectedPacketForSlip] = useState<CoursePacket | null>(null);
  const [slipScripts, setSlipScripts] = useState<ScriptEntry[]>([]);

  // Helper to extract candidate scripts received for a given course code
  const getCourseScripts = (courseCode: string, packet?: CoursePacket | null): ScriptEntry[] => {
    if (!courseCode) return [];
    const normCode = normalizeDiagnosticCourse(courseCode);
    const evals = allCourseEvaluations && allCourseEvaluations.length > 0 ? allCourseEvaluations : sessionCourseEvaluations;
    const matched = evals.filter((e) => {
      const code = normalizeDiagnosticCourse(e.courseCode || (e as any).Course_Code || '');
      if (code !== normCode) return false;
      if (ledgerScope === 'ALL') return true;
      return normalizeSessionName(e.session || (e as any).Session) === normalizeSessionName(currentSession);
    });

    let allEntries: ScriptEntry[] = [];
    if (matched.length > 0) {
      allEntries = matched.map((e, idx) => ({
        sno: idx + 1,
        enrollmentNo: e.enrollmentNo || (e as any).Enrollment_No || '',
        studentName: e.studentName || (e as any).Candidate_Name || '',
        tokenNo: e.tokenNo || `SC2033-${e.enrollmentNo}`,
        submissionDate: e.submissionDate || e.receiptDate || '',
        marks: e.marks,
      }));
    } else {
      const activeIntakes = ledgerScope === 'ALL'
        ? (allIntakes && allIntakes.length > 0 ? allIntakes : sessionIntakes)
        : sessionIntakes;
      const fromIntakes: ScriptEntry[] = [];
      activeIntakes.forEach((it: any) => {
        const courses = (it.courseCodes || it.courses || []).map((c: string) => normalizeDiagnosticCourse(c));
        if (courses.includes(normCode)) {
          fromIntakes.push({
            sno: fromIntakes.length + 1,
            enrollmentNo: it.enrollmentNo,
            studentName: it.studentName || it.candidateName || '',
            tokenNo: it.tokenNo,
            submissionDate: it.submissionDate || it.receiptDate,
            marks: it.marks?.[normCode] ?? null,
          });
        }
      });
      allEntries = fromIntakes;
    }

    // If a specific packet is requested, filter strictly to its assigned students or slice
    if (packet) {
      if (Array.isArray(packet.assignedEnrollments) && packet.assignedEnrollments.length > 0) {
        const enrSet = new Set(packet.assignedEnrollments.map((enr) => normalizeDiagnosticEnrollment(enr)));
        const filtered = allEntries.filter((s) => enrSet.has(normalizeDiagnosticEnrollment(s.enrollmentNo)));
        if (filtered.length > 0) {
          return filtered.map((s, idx) => ({ ...s, sno: idx + 1 }));
        }
      }
      return allEntries.slice(0, packet.scriptCount).map((s, idx) => ({ ...s, sno: idx + 1 }));
    }

    return allEntries;
  };

  // Helper to compute allocation stats for a course and prevent duplicate packet dispatch
  const getCoursePacketStats = (courseCode: string, excludePacketId?: string) => {
    const normCode = normalizeDiagnosticCourse(courseCode);
    const allScripts = getCourseScripts(courseCode);
    const poolPackets = ledgerScope === 'ALL' ? (packets || []) : (sessionPackets || []);
    const relevantPackets = poolPackets.filter(
      (p) => normalizeDiagnosticCourse(p.courseCode) === normCode && p.id !== excludePacketId
    );

    const alreadyAssignedEnrollments = new Set<string>();
    let packetedCount = 0;

    relevantPackets.forEach((pkt) => {
      packetedCount += pkt.scriptCount;
      if (Array.isArray(pkt.assignedEnrollments)) {
        pkt.assignedEnrollments.forEach((enr) => alreadyAssignedEnrollments.add(normalizeDiagnosticEnrollment(enr)));
      }
    });

    // Unassigned scripts that have NOT been packeted in any active packet
    const unassignedScripts = allScripts.filter(
      (s) => !alreadyAssignedEnrollments.has(normalizeDiagnosticEnrollment(s.enrollmentNo))
    );

    const availableCount = Math.max(0, allScripts.length - packetedCount);

    return {
      totalReceived: allScripts.length,
      packetedCount,
      availableCount,
      alreadyAssignedEnrollments,
      unassignedScripts,
      relevantPackets,
    };
  };

  // Enrolled candidate scripts for the currently selected packet course (unassigned pool prioritized)
  const selectedCourseScripts = useMemo(() => {
    if (!selectedCourseForPacket) return [];
    const stats = getCoursePacketStats(selectedCourseForPacket);
    return stats.unassignedScripts.length > 0 ? stats.unassignedScripts : getCourseScripts(selectedCourseForPacket);
  }, [selectedCourseForPacket, allCourseEvaluations, sessionCourseEvaluations, allIntakes, sessionIntakes, sessionPackets, ledgerScope, currentSession]);

  // Course aggregation summary with duplicate dispatch checking
  const courseLedger = useMemo(() => {
    const activeIntakes = ledgerScope === 'ALL'
      ? (allIntakes && allIntakes.length > 0 ? allIntakes : sessionIntakes)
      : sessionIntakes;
    const activeEvaluations = ledgerScope === 'ALL'
      ? (allCourseEvaluations && allCourseEvaluations.length > 0 ? allCourseEvaluations : sessionCourseEvaluations)
      : sessionCourseEvaluations;

    const map = new Map<
      string,
      {
        courseCode: string;
        programmeCode: string;
        totalReceived: number;
        evaluated: number;
        pending: number;
        packetedScripts: number;
        unassignedAvailable: number;
        packetsFormed: CoursePacket[];
      }
    >();

    // Scan all intakes in selected scope
    activeIntakes.forEach((intake: any) => {
      const courses = intake.courseCodes || intake.courses || [];
      if (Array.isArray(courses)) {
        courses.forEach((rawCode: string) => {
          const code = rawCode.trim().toUpperCase();
          if (!code) return;
          if (!map.has(code)) {
            map.set(code, {
              courseCode: code,
              programmeCode: intake.programmeCode || intake.programme || 'MEG',
              totalReceived: 0,
              evaluated: 0,
              pending: 0,
              packetedScripts: 0,
              unassignedAvailable: 0,
              packetsFormed: [],
            });
          }
          const item = map.get(code)!;
          item.totalReceived++;
          const mark = intake.marks?.[code];
          const hasMark = mark !== null && mark !== undefined && mark !== '';
          if (hasMark) {
            item.evaluated++;
          } else {
            const matchingEval = activeEvaluations.find(
              (e: any) =>
                (e.enrollmentNo === intake.enrollmentNo || e.Enrollment_No === intake.enrollmentNo) &&
                (e.courseCode === code || e.Course_Code === code)
            );
            if (matchingEval && typeof matchingEval.marks === 'number') {
              item.evaluated++;
            } else {
              item.pending++;
            }
          }
        });
      }
    });

    // Also ensure every course in activeEvaluations is registered
    activeEvaluations.forEach((evalItem: any) => {
      const code = (evalItem.courseCode || evalItem.Course_Code || '').trim().toUpperCase();
      if (!code) return;
      if (!map.has(code)) {
        const hasMark = typeof evalItem.marks === 'number';
        map.set(code, {
          courseCode: code,
          programmeCode: evalItem.programmeCode || evalItem.Programme || 'MEG',
          totalReceived: 1,
          evaluated: hasMark ? 1 : 0,
          pending: hasMark ? 0 : 1,
          packetedScripts: 0,
          unassignedAvailable: 0,
          packetsFormed: [],
        });
      }
    });

    // Attach packets for this scope and compute exact unassigned scripts count
    const poolPackets = ledgerScope === 'ALL' ? (packets || []) : (sessionPackets || []);
    poolPackets.forEach((pkt) => {
      const normPktCode = normalizeDiagnosticCourse(pkt.courseCode);
      for (const [key, item] of map.entries()) {
        if (normalizeDiagnosticCourse(key) === normPktCode) {
          if (!item.packetsFormed.some((existing) => existing.id === pkt.id)) {
            item.packetsFormed.push(pkt);
            item.packetedScripts += pkt.scriptCount;
          }
          break;
        }
      }
    });

    // Calculate unassignedAvailable ensuring no negative counts
    map.forEach((item) => {
      item.unassignedAvailable = Math.max(0, item.totalReceived - item.packetedScripts);
    });

    return Array.from(map.values()).sort((a, b) => b.totalReceived - a.totalReceived);
  }, [allIntakes, sessionIntakes, allCourseEvaluations, sessionCourseEvaluations, sessionPackets, packets, ledgerScope]);

  // Evaluator lookup helper
  const getEvaluatorInfo = (evId: string | null) => {
    if (!evId) return null;
    return evaluators.find((e) => e.id === evId);
  };

  // Dynamic Programme list with aggregated counts
  const availableProgrammes = useMemo(() => {
    const map = new Map<string, { code: string; scriptCount: number; courseCount: number; unassignedCount: number }>();
    courseLedger.forEach((c) => {
      const prog = (c.programmeCode || 'IGNOU').trim().toUpperCase();
      if (!map.has(prog)) {
        map.set(prog, { code: prog, scriptCount: 0, courseCount: 0, unassignedCount: 0 });
      }
      const item = map.get(prog)!;
      item.scriptCount += c.totalReceived;
      item.courseCount += 1;
      item.unassignedCount += c.unassignedAvailable;
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [courseLedger]);

  // Dynamic Course Code list filtered by selected programme
  const availableCourseCodes = useMemo(() => {
    const list = filterProgramme === 'ALL'
      ? courseLedger
      : courseLedger.filter((c) => (c.programmeCode || '').trim().toUpperCase() === filterProgramme.trim().toUpperCase());
    return list.map((c) => ({
      code: c.courseCode,
      programme: c.programmeCode,
      totalReceived: c.totalReceived,
      unassignedAvailable: c.unassignedAvailable,
      packetedScripts: c.packetedScripts,
    })).sort((a, b) => a.code.localeCompare(b.code));
  }, [courseLedger, filterProgramme]);

  // Synchronized Filtered Course Ledger rows
  const filteredCourseLedger = useMemo(() => {
    return courseLedger.filter((c) => {
      if (filterProgramme !== 'ALL' && (c.programmeCode || '').trim().toUpperCase() !== filterProgramme.trim().toUpperCase()) {
        return false;
      }
      if (filterCourseCode !== 'ALL' && c.courseCode.trim().toUpperCase() !== filterCourseCode.trim().toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const codeMatch = c.courseCode.toLowerCase().includes(q);
        const progMatch = (c.programmeCode || '').toLowerCase().includes(q);
        const titleMatch = getCourseTitle(c.courseCode, c.programmeCode).toLowerCase().includes(q);
        if (!codeMatch && !progMatch && !titleMatch) {
          return false;
        }
      }
      return true;
    });
  }, [courseLedger, filterProgramme, filterCourseCode, searchQuery, getCourseTitle]);

  // Synchronized Filtered Session / Scope Packets
  const filteredSessionPackets = useMemo(() => {
    const baseList = ledgerScope === 'ALL' ? (packets || []) : (sessionPackets || []);
    return baseList.filter((pkt) => {
      if (filterProgramme !== 'ALL' && (pkt.programmeCode || '').trim().toUpperCase() !== filterProgramme.trim().toUpperCase()) {
        return false;
      }
      if (filterCourseCode !== 'ALL' && normalizeDiagnosticCourse(pkt.courseCode) !== normalizeDiagnosticCourse(filterCourseCode)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const pktNoMatch = (pkt.packetNumber || '').toLowerCase().includes(q);
        const codeMatch = pkt.courseCode.toLowerCase().includes(q) || normalizeDiagnosticCourse(pkt.courseCode).toLowerCase().includes(q);
        const progMatch = (pkt.programmeCode || '').toLowerCase().includes(q);
        const notesMatch = (pkt.notes || '').toLowerCase().includes(q);
        const ev = evaluators.find((e) => e.id === pkt.evaluatorId);
        const evMatch = ev ? `${ev.evaluatorName || ev.name} ${ev.evaluatorCode || ''}`.toLowerCase().includes(q) : false;
        if (!pktNoMatch && !codeMatch && !progMatch && !notesMatch && !evMatch) {
          return false;
        }
      }
      return true;
    });
  }, [ledgerScope, packets, sessionPackets, filterProgramme, filterCourseCode, searchQuery, evaluators]);

  // Filter actions
  const handleProgrammeChange = (prog: string) => {
    setFilterProgramme(prog);
    setFilterCourseCode('ALL');
  };

  const handleResetFilters = () => {
    setFilterProgramme('ALL');
    setFilterCourseCode('ALL');
    setSearchQuery('');
  };

  const isFilterActive = filterProgramme !== 'ALL' || filterCourseCode !== 'ALL' || searchQuery.trim() !== '';

  // Form Packet Modal: Available courses for chosen modal programme
  const modalAvailableCourses = useMemo(() => {
    if (!modalProgramme) return courseLedger;
    return courseLedger.filter((c) => (c.programmeCode || '').trim().toUpperCase() === modalProgramme.trim().toUpperCase());
  }, [courseLedger, modalProgramme]);

  // Handle selecting a course inside the Form Packet Modal
  const handleCourseSelectionInModal = (courseCode: string) => {
    setSelectedCourseForPacket(courseCode);
    const stats = getCoursePacketStats(courseCode);
    const suggestedCount = stats.availableCount > 0 ? stats.availableCount : 1;
    setScriptCountInput(suggestedCount);

    // Auto-select eligible evaluator if any
    const eligible = evaluators.find((e) => e.eligibleCourses.includes(courseCode));
    setSelectedEvaluatorId(eligible?.id || '');

    // Set modal programme if matched
    const match = courseLedger.find((c) => c.courseCode === courseCode);
    if (match && match.programmeCode) {
      setModalProgramme(match.programmeCode);
    }
  };

  // Open generic Form Packet Modal (chooses currently filtered course or first with ready scripts)
  const handleOpenGenericPacketModal = () => {
    if (!isAdmin) return;
    const defaultCourse =
      (filterCourseCode !== 'ALL' ? courseLedger.find((c) => c.courseCode === filterCourseCode) : null) ||
      (filterProgramme !== 'ALL' ? courseLedger.find((c) => c.programmeCode === filterProgramme && c.unassignedAvailable > 0) : null) ||
      courseLedger.find((c) => c.unassignedAvailable > 0) ||
      courseLedger[0];

    if (defaultCourse) {
      handleOpenPacketModal(defaultCourse.courseCode, defaultCourse.unassignedAvailable);
    } else {
      showToast('No courses available to form a packet.', 'info');
    }
  };

  // Open Form Packet Modal with duplicate dispatch guard
  const handleOpenPacketModal = (courseCode: string, availableCount: number) => {
    if (!isAdmin) return;
    const stats = getCoursePacketStats(courseCode);

    if (stats.availableCount <= 0) {
      showToast(`All ${stats.totalReceived} scripts for ${courseCode} have already been dispatched in packets.`, 'warning');
      return;
    }

    const courseItem = courseLedger.find((c) => c.courseCode === courseCode);
    setModalProgramme(courseItem?.programmeCode || '');
    handleCourseSelectionInModal(courseCode);

    // Default expected return date: 15 days from now
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 15);
    setExpectedReturnDate(returnDate.toISOString().split('T')[0]);

    setIsPacketModalOpen(true);
  };

  // Submit Packet Creation with duplicate check and assigned enrollments tracking
  const handleCreatePacketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseForPacket || scriptCountInput <= 0) return;

    const stats = getCoursePacketStats(selectedCourseForPacket);

    // Guard: Prevent packeting more scripts than unassigned available
    if (scriptCountInput > stats.availableCount) {
      showToast(`Cannot dispatch ${scriptCountInput} scripts. Only ${stats.availableCount} unassigned script(s) remaining for ${selectedCourseForPacket}.`, 'error');
      return;
    }

    const courseItem = courseLedger.find((c) => c.courseCode === selectedCourseForPacket);

    // Select unassigned candidate scripts with fallback to all course scripts
    let candidateEnrollments = stats.unassignedScripts
      .slice(0, scriptCountInput)
      .map((s) => s.enrollmentNo);

    if (candidateEnrollments.length < scriptCountInput) {
      const allScripts = getCourseScripts(selectedCourseForPacket);
      const chosenSet = new Set(candidateEnrollments.map((e) => normalizeDiagnosticEnrollment(e)));
      for (const s of allScripts) {
        if (candidateEnrollments.length >= scriptCountInput) break;
        const normE = normalizeDiagnosticEnrollment(s.enrollmentNo);
        if (!chosenSet.has(normE)) {
          chosenSet.add(normE);
          candidateEnrollments.push(s.enrollmentNo);
        }
      }
    }

    const createdPkt = createPacket({
      courseCode: selectedCourseForPacket,
      programmeCode: courseItem?.programmeCode || 'IGNOU',
      evaluatorId: selectedEvaluatorId || null,
      scriptCount: scriptCountInput,
      expectedReturnDate,
      notes: packetNotes.trim() || undefined,
      assignedEnrollments: candidateEnrollments,
    });

    // Automatically trigger the printable Dispatch Slip modal immediately with exact assigned candidates
    const scriptsForSlip = getCourseScripts(selectedCourseForPacket, createdPkt);
    setSelectedPacketForSlip(createdPkt);
    setSlipScripts(scriptsForSlip);
    setIsDispatchSlipOpen(true);

    const evObj = evaluators.find((e) => e.id === selectedEvaluatorId);
    if (evObj) {
      showToast(`Packet ${createdPkt.packetNumber} formed & allotted to ${evObj.evaluatorName || evObj.name} across ${scriptCountInput} script(s) in Evaluation Master.`, 'success');
    } else {
      showToast(`Evaluation Packet ${createdPkt.packetNumber} formed with ${scriptCountInput} script(s).`, 'success');
    }

    setIsPacketModalOpen(false);
    setSelectedCourseForPacket('');
    setSelectedEvaluatorId('');
    setPacketNotes('');
  };

  // Open Edit Packet Modal
  const handleOpenEditModal = (pkt: CoursePacket) => {
    requireEditingAuth(
      `Edit Packet Allotment: ${pkt.packetNumber}`,
      () => {
        setEditingPacket(pkt);
        setEditEvaluatorId(pkt.evaluatorId || '');
        setEditScriptCount(pkt.scriptCount);
        setEditExpectedReturnDate(pkt.expectedReturnDate || '');
        setEditPacketNotes(pkt.notes || '');
        setEditPacketStatus(pkt.status);
        setIsEditModalOpen(true);
      },
      'Personal PIN or Master Passphrase verification required to modify evaluator packet allotment.'
    );
  };

  // Submit Edit Packet
  const handleSaveEditSubmit = (e: React.FormEvent, openSlipAfterSave = false) => {
    e.preventDefault();
    if (!editingPacket) return;

    const stats = getCoursePacketStats(editingPacket.courseCode, editingPacket.id);
    const maxAllowed = editingPacket.scriptCount + stats.availableCount;

    if (editScriptCount <= 0 || editScriptCount > maxAllowed) {
      showToast(`Invalid script count. Maximum available for this course is ${maxAllowed}.`, 'error');
      return;
    }

    // Adjust assigned candidate enrollments if script count was modified
    let updatedEnrollments = editingPacket.assignedEnrollments || [];
    if (editScriptCount !== editingPacket.scriptCount) {
      const allCourseScripts = getCourseScripts(editingPacket.courseCode);
      const otherPacketAssigned = stats.alreadyAssignedEnrollments;
      const unassignedOrCurrent = allCourseScripts.filter(
        (s) => !otherPacketAssigned.has(s.enrollmentNo.trim().toUpperCase())
      );
      updatedEnrollments = unassignedOrCurrent.slice(0, editScriptCount).map((s) => s.enrollmentNo);
    }

    const updates: Partial<CoursePacket> = {
      evaluatorId: editEvaluatorId || null,
      scriptCount: editScriptCount,
      expectedReturnDate: editExpectedReturnDate || null,
      notes: editPacketNotes.trim() || undefined,
      status: editPacketStatus,
      assignedEnrollments: updatedEnrollments,
      assignedDate: editEvaluatorId ? (editingPacket.assignedDate || new Date().toISOString().split('T')[0]) : null,
      returnedDate: editPacketStatus === 'Evaluated' ? (editingPacket.returnedDate || new Date().toISOString().split('T')[0]) : null,
    };

    updatePacket(editingPacket.id, updates);
    const updatedPktObj: CoursePacket = { ...editingPacket, ...updates };

    const updatedEv = evaluators.find((e) => e.id === editEvaluatorId);
    if (updatedEv) {
      showToast(`Packet ${editingPacket.packetNumber} updated & allotted to ${updatedEv.evaluatorName || updatedEv.name} in Evaluation Master.`, 'success');
    } else {
      showToast(`Packet ${editingPacket.packetNumber} updated successfully.`, 'success');
    }
    setIsEditModalOpen(false);

    if (openSlipAfterSave) {
      setSelectedPacketForSlip(updatedPktObj);
      setSlipScripts(getCourseScripts(updatedPktObj.courseCode, updatedPktObj));
      setIsDispatchSlipOpen(true);
    }

    setEditingPacket(null);
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (pkt: CoursePacket) => {
    requireEditingAuth(
      `Delete Evaluation Packet: ${pkt.packetNumber}`,
      () => {
        setPacketToDelete(pkt);
        setIsDeleteModalOpen(true);
      },
      'Personal PIN or Master Passphrase verification required to delete evaluation packet and unassign scripts.'
    );
  };

  // Confirm Delete Packet and return scripts back to unassigned pool
  const handleConfirmDelete = () => {
    if (!packetToDelete) return;
    const pktNumber = packetToDelete.packetNumber;
    const scriptCount = packetToDelete.scriptCount;

    deletePacket(packetToDelete.id);
    showToast(`Packet ${pktNumber} deleted. ${scriptCount} script(s) returned to unassigned pool.`, 'info');

    setIsDeleteModalOpen(false);
    setPacketToDelete(null);
  };

  // Quick packet status update handler
  const handleUpdatePacketStatus = (packetId: string, status: CoursePacket['status']) => {
    updatePacket(packetId, {
      status,
      returnedDate: status === 'Evaluated' ? new Date().toISOString().split('T')[0] : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base sm:text-lg font-bold text-zinc-900">
              Course Assignment Ledger & Packet Dispatch
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Aggregated course-wise ledger with duplicate dispatch protection and evaluation packet lifecycle management.
            {ledgerScope === 'ALL'
              ? ` Viewing all courses across cycles (${allCourseEvaluations.length || sessionCourseEvaluations.length} total scripts loaded).`
              : ` Isolated for session ${currentSession} (${sessionCourseEvaluations.length} scripts).`}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Scope Switcher: All vs Current Session */}
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setLedgerScope('ALL')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                ledgerScope === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title="Show all scripts across all cycles"
            >
              All Courses ({allCourseEvaluations.length || sessionCourseEvaluations.length} Scripts)
            </button>
            <button
              type="button"
              onClick={() => setLedgerScope('SESSION')}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                ledgerScope === 'SESSION'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
              title={`Filter strictly for ${currentSession}`}
            >
              {currentSession} ({sessionCourseEvaluations.length})
            </button>
          </div>

          {/* Download Packet Lifecycle SOP Guide PDF */}
          <button
            type="button"
            onClick={() => {
              downloadPacketLifecycleSOP_PDF();
              showToast('Official Packet Lifecycle SOP Guide downloaded (PDF)', 'success');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer"
            title="Download Official IGNOU SC-2033 Packet Dispatch & Evaluation Lifecycle SOP (PDF)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Packet SOP (PDF)</span>
          </button>

          {/* Autonomous Data Governance: Reconcile Button */}
          <button
            type="button"
            onClick={() => reconcileIntakeAndCourseLedger()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-2xs cursor-pointer"
            title="Scan and verify all intake receipts vs course ledger rows, restoring any missing scripts automatically"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Reconcile & Restore Scripts</span>
          </button>

          {!isAdmin && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Read-Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Programme & Course Code Filter Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Select & Filter by Programme / Course</span>
          </div>

          <div className="flex items-center gap-2">
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenGenericPacketModal}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                title="Form a new evaluation packet by selecting Programme & Course"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Form New Packet</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Programme Dropdown */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              <span>Programme</span>
            </label>
            <select
              value={filterProgramme}
              onChange={(e) => handleProgrammeChange(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition cursor-pointer"
            >
              <option value="ALL">All Programmes ({availableProgrammes.length} programmes • {courseLedger.length} courses)</option>
              {availableProgrammes.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} ({p.scriptCount} scripts • {p.courseCount} courses)
                </option>
              ))}
            </select>
          </div>

          {/* Course Code Dropdown */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Course Code</span>
            </label>
            <select
              value={filterCourseCode}
              onChange={(e) => setFilterCourseCode(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-300 rounded-xl text-xs font-mono font-bold text-zinc-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition cursor-pointer"
            >
              <option value="ALL">
                {filterProgramme === 'ALL'
                  ? `All Courses (${availableCourseCodes.length})`
                  : `All ${filterProgramme} Courses (${availableCourseCodes.length})`}
              </option>
              {availableCourseCodes.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.unassignedAvailable} ready / {c.totalReceived} total)
                </option>
              ))}
            </select>
          </div>

          {/* Instant Search Box */}
          <div className="sm:col-span-4">
            <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>Search Course / Title</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter code, title (e.g. MEG-01, Poetry)..."
                className="w-full pl-8 pr-8 py-2 bg-zinc-50 hover:bg-zinc-100/80 border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-zinc-400 hover:text-zinc-600 absolute right-2 top-1/2 -translate-y-1/2 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Summary Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-zinc-500 border-t border-zinc-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Matching Ledger:</span>
            <span className="font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
              {filteredCourseLedger.length} of {courseLedger.length} Courses
            </span>
            <span>•</span>
            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {filteredCourseLedger.reduce((sum, c) => sum + c.totalReceived, 0)} Scripts
            </span>
            <span>•</span>
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {filteredSessionPackets.length} Packets
            </span>
          </div>

          {isFilterActive && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-zinc-400">Filters:</span>
              {filterProgramme !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                  Prog: {filterProgramme}
                </span>
              )}
              {filterCourseCode !== 'ALL' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Course: {filterCourseCode}
                </span>
              )}
              {searchQuery.trim() && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-900 border border-amber-200">
                  "{searchQuery.trim()}"
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Course Aggregation Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
          <div className="font-bold text-xs text-zinc-800 uppercase tracking-wider flex items-center gap-2">
            <span>Active Courses Ledger</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-zinc-200/80 text-zinc-800 font-bold">
              {filteredCourseLedger.length} of {courseLedger.length} Courses
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
            <span>
              Total Received: <strong className="text-zinc-900">{filteredCourseLedger.reduce((sum, c) => sum + c.totalReceived, 0)} Scripts</strong>
            </span>
            <span>•</span>
            <span>
              In Packets: <strong className="text-indigo-700">{filteredCourseLedger.reduce((sum, c) => sum + c.packetedScripts, 0)} Scripts</strong>
            </span>
            <span>•</span>
            <span>
              Ready to Dispatch: <strong className="text-emerald-700">{filteredCourseLedger.reduce((sum, c) => sum + c.unassignedAvailable, 0)} Scripts</strong>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full text-xs text-left min-w-[840px]">
            <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
              <tr>
                <th className="py-3 px-4">Course Code</th>
                <th className="py-3 px-4">Prog</th>
                <th className="py-3 px-4 text-center">Scripts Received</th>
                <th className="py-3 px-4 text-center">In Packets</th>
                <th className="py-3 px-4 text-center">Unassigned</th>
                <th className="py-3 px-4">Packets Dispatched</th>
                <th className="py-3 px-4 text-right">Coordinator Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredCourseLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Filter className="w-8 h-8 text-zinc-300 mx-auto" />
                      <p className="font-semibold text-xs text-zinc-700">No courses match the selected filters.</p>
                      <p className="text-[11px] text-zinc-400">
                        {isFilterActive
                          ? 'Try selecting another Programme or Course Code, or reset the filters.'
                          : `No assignment scripts recorded in ${currentSession}.`}
                      </p>
                      {isFilterActive && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourseLedger.map((course) => {
                  const isFullyPacketed = course.unassignedAvailable === 0 && course.totalReceived > 0;
                  return (
                    <tr key={course.courseCode} className="hover:bg-zinc-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-sm text-indigo-950">
                        <div className="flex items-center gap-1.5">
                          <span>{course.courseCode}</span>
                          {isDualComponentCourse(course.courseCode) ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                              TMA + Practical
                            </span>
                          ) : isPracticalCourse(course.courseCode) ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-purple-100 text-purple-900 border border-purple-200">
                              Practical
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] font-normal text-zinc-500 font-sans truncate max-w-[200px]">
                          {getCourseTitle(course.courseCode)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-700">
                        {course.programmeCode}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-900">
                        {course.totalReceived}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-indigo-900">
                        {course.packetedScripts > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {course.packetedScripts}
                          </span>
                        ) : (
                          <span className="text-zinc-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {course.unassignedAvailable > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {course.unassignedAvailable} Ready
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-400 italic">0 left</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {course.packetsFormed.length === 0 ? (
                          <span className="text-zinc-400 italic text-[11px]">No packets formed</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {course.packetsFormed.map((pkt, pktIdx) => {
                              const ev = getEvaluatorInfo(pkt.evaluatorId);
                              return (
                                <span
                                  key={`${pkt.id}-${pktIdx}`}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                    pkt.status === 'Evaluated'
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                      : pkt.status === 'Dispatched'
                                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                                      : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                                  }`}
                                  title={`Status: ${pkt.status} | Evaluator: ${ev ? ev.name : 'Unassigned'} (${pkt.scriptCount} scripts)`}
                                >
                                  {pkt.packetNumber} ({pkt.scriptCount})
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin ? (
                          isFullyPacketed ? (
                            <span
                              className="px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-not-allowed select-none"
                              title="Duplicate Dispatch Prevented: All received scripts for this course are already inside dispatched packets."
                            >
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              <span>All Packeted</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleOpenPacketModal(course.courseCode, course.unassignedAvailable)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                              title={`Form packet for ${course.unassignedAvailable} unassigned script(s)`}
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Form Packet ({course.unassignedAvailable})</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Coordinator Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Course Packets Tracking Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-zinc-900 text-sm">
              {ledgerScope === 'ALL' ? 'Course Packets Tracking (All Cycles)' : `Session Packets Tracking (${currentSession})`}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 text-indigo-900 border border-indigo-200 font-bold">
              {filteredSessionPackets.length} of {(ledgerScope === 'ALL' ? packets : sessionPackets).length} Packets
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-zinc-500 font-medium">
              {filteredSessionPackets.reduce((sum, p) => sum + p.scriptCount, 0)} of {(ledgerScope === 'ALL' ? packets : sessionPackets).reduce((sum, p) => sum + p.scriptCount, 0)} Scripts Dispatched
            </span>
            <button
              type="button"
              onClick={() => {
                downloadPacketLifecycleSOP_PDF();
                showToast('Official Packet Lifecycle SOP Guide downloaded (PDF)', 'success');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition cursor-pointer"
              title="Download Packet Dispatch SOP & Lifecycle Guidelines PDF"
            >
              <Download className="w-3 h-3" />
              <span>SOP Guide (PDF)</span>
            </button>
          </div>
        </div>

        {(ledgerScope === 'ALL' ? packets : sessionPackets).length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No evaluation packets have been created {ledgerScope === 'ALL' ? 'across all cycles yet' : `for ${currentSession} yet`}. Form a packet from the ledger above to dispatch scripts to evaluators.
          </div>
        ) : filteredSessionPackets.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 space-y-2">
            <PackageCheck className="w-8 h-8 text-zinc-300 mx-auto" />
            <p className="font-semibold text-zinc-700">No evaluation packets match the selected filters.</p>
            <p className="text-[11px] text-zinc-400">
              Packets exist for other courses, but none match {filterProgramme !== 'ALL' ? `programme ${filterProgramme}` : ''}{filterCourseCode !== 'ALL' ? ` course ${filterCourseCode}` : ''}.
            </p>
            {isFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessionPackets.map((pkt, pktIdx) => {
              const ev = getEvaluatorInfo(pkt.evaluatorId);
              return (
                <div
                  key={`${pkt.id}-${pktIdx}`}
                  className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-indigo-950 text-xs block">
                          {pkt.packetNumber}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {pkt.programmeCode} • Course: <strong className="text-zinc-800">{pkt.courseCode}</strong>
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          pkt.status === 'Evaluated'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : pkt.status === 'Dispatched'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                        }`}
                      >
                        {pkt.status}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Scripts in Packet:</span>
                        <span className="font-bold text-zinc-900">{pkt.scriptCount} Scripts</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-zinc-500">Assigned Evaluator:</span>
                        <span className="font-semibold text-indigo-950 text-right truncate max-w-[140px]" title={ev?.name}>
                          {ev ? `${ev.name} (${ev.evaluatorCode})` : 'Unassigned'}
                        </span>
                      </div>
                      {pkt.expectedReturnDate && (
                        <div className="flex justify-between text-[11px]">
                          <span className="text-zinc-500">Expected Return:</span>
                          <span className="font-medium text-zinc-800">
                            {formatDate(pkt.expectedReturnDate)}
                          </span>
                        </div>
                      )}
                    </div>

                    {pkt.notes && (
                      <div className="text-[11px] text-zinc-500 italic bg-white/70 p-2 rounded border border-zinc-200/70">
                        {pkt.notes}
                      </div>
                    )}
                  </div>

                  {/* Packet actions: Print Slip, Edit, Delete & Status Toggles */}
                  <div className="pt-3 border-t border-zinc-200 space-y-2">
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPacketForSlip(pkt);
                            setSlipScripts(getCourseScripts(pkt.courseCode, pkt));
                            setIsDispatchSlipOpen(true);
                          }}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Print Official Packet Dispatch Slip"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>Print Slip</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const ev = getEvaluatorInfo(pkt.evaluatorId);
                            const scripts = getCourseScripts(pkt.courseCode, pkt);
                            downloadPacketDispatchSlipPDF(pkt, ev || null, scripts, {
                              studyCentreName: settings.institutionName,
                              studyCentreCode: settings.centreCode || 'SC-2033',
                              regionalCentre: settings.regionalCentreCode,
                              coordinatorName: settings.coordinatorName,
                              courseTitle: getCourseTitle(pkt.courseCode, pkt.programmeCode),
                            });
                            showToast(`Downloaded PDF slip for ${pkt.packetNumber}`, 'info');
                          }}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Download Official Packet Dispatch Slip PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>PDF</span>
                        </button>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(pkt)}
                            className="p-1.5 bg-white hover:bg-amber-50 text-zinc-600 hover:text-amber-800 border border-zinc-300 hover:border-amber-300 rounded-lg transition shadow-2xs cursor-pointer"
                            title="Edit / Modify Packet Details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(pkt)}
                            className="p-1.5 bg-white hover:bg-rose-50 text-zinc-600 hover:text-rose-800 border border-zinc-300 hover:border-rose-300 rounded-lg transition shadow-2xs cursor-pointer"
                            title="Delete Packet & Return Scripts to Pool"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center justify-end gap-1 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdatePacketStatus(pkt.id, 'Dispatched')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                            pkt.status === 'Dispatched'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                          }`}
                        >
                          Dispatched
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdatePacketStatus(pkt.id, 'Evaluated')}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                            pkt.status === 'Evaluated'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                          }`}
                        >
                          Evaluated
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form Packet Modal (Admin Only) */}
      {isPacketModalOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                <PackageCheck className="w-4 h-4 text-indigo-600" />
                <span>Form Evaluation Packet {selectedCourseForPacket ? `(${selectedCourseForPacket})` : ''}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPacketModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-bold p-1 rounded-md hover:bg-zinc-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePacketSubmit} className="mt-4 space-y-4 text-xs overflow-y-auto pr-1">
              {/* Programme & Course Selection Box */}
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1">
                    <Filter className="w-3 h-3 text-indigo-600" />
                    <span>Select Programme & Course</span>
                  </span>
                  {selectedCourseScripts.length > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {selectedCourseScripts.length} Unassigned Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded border border-rose-300">
                      0 Scripts Ready
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-indigo-600" />
                      <span>Programme</span>
                    </label>
                    <select
                      value={modalProgramme}
                      onChange={(e) => {
                        const newProg = e.target.value;
                        setModalProgramme(newProg);
                        const progCourses = courseLedger.filter(
                          (c) => (c.programmeCode || '').toUpperCase() === newProg.toUpperCase()
                        );
                        const withReady = progCourses.find((c) => c.unassignedAvailable > 0);
                        if (withReady) {
                          handleCourseSelectionInModal(withReady.courseCode);
                        } else if (progCourses.length > 0) {
                          handleCourseSelectionInModal(progCourses[0].courseCode);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-zinc-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {availableProgrammes.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.code} ({p.courseCount} courses • {p.unassignedCount} ready)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-indigo-600" />
                      <span>Course Code</span>
                    </label>
                    <select
                      value={selectedCourseForPacket}
                      onChange={(e) => handleCourseSelectionInModal(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-zinc-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {modalAvailableCourses.map((c) => (
                        <option key={c.courseCode} value={c.courseCode}>
                          {c.courseCode} — {c.unassignedAvailable} ready of {c.totalReceived}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-indigo-200/80 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <div className="text-xs font-semibold text-indigo-950 truncate max-w-[340px]">
                    {selectedCourseForPacket} • {getCourseTitle(selectedCourseForPacket, modalProgramme)}
                  </div>
                  <div className="text-[10px] text-indigo-700 italic">
                    Protected: already dispatched scripts are excluded
                  </div>
                </div>
              </div>

              {/* Script count field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-zinc-700">
                    Scripts in this Packet <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-zinc-500">
                    Available unassigned: <strong className="text-indigo-600">{selectedCourseScripts.length}</strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={selectedCourseScripts.length || 1}
                    value={scriptCountInput}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setScriptCountInput(Math.min(val, selectedCourseScripts.length || 1));
                    }}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold text-sm text-zinc-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    required
                  />
                  {scriptCountInput !== selectedCourseScripts.length && selectedCourseScripts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScriptCountInput(selectedCourseScripts.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200 transition cursor-pointer"
                    >
                      Max ({selectedCourseScripts.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Itemized scripts preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-zinc-700">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Unassigned Scripts to Include ({Math.min(scriptCountInput, selectedCourseScripts.length)} of {selectedCourseScripts.length})</span>
                  </div>
                  <span className="text-[10px] text-zinc-400">Printed on dispatch slip docket</span>
                </div>

                {selectedCourseScripts.length === 0 ? (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-center text-zinc-500 text-[11px]">
                    No unassigned student scripts available for {selectedCourseForPacket}. All received scripts are in existing packets.
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white max-h-36 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-zinc-50 sticky top-0 border-b border-zinc-200 text-zinc-600">
                        <tr>
                          <th className="py-1 px-2 font-bold w-8 text-center">#</th>
                          <th className="py-1 px-2 font-bold">Enrollment No</th>
                          <th className="py-1 px-2 font-bold">Candidate Name</th>
                          <th className="py-1 px-2 font-bold">Token / Receipt</th>
                          <th className="py-1 px-2 font-bold text-right">Status / Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 font-mono">
                        {selectedCourseScripts.slice(0, scriptCountInput).map((s, idx) => (
                          <tr key={`${s.enrollmentNo}-${idx}`} className="hover:bg-zinc-50/80 transition-colors">
                            <td className="py-1 px-2 text-center text-zinc-400 font-sans">{idx + 1}</td>
                            <td className="py-1 px-2 font-bold text-zinc-800">{s.enrollmentNo}</td>
                            <td className="py-1 px-2 font-sans font-medium text-zinc-700 truncate max-w-[130px]">
                              {s.studentName || '—'}
                            </td>
                            <td className="py-1 px-2 text-[10px] text-zinc-500 truncate">
                              {s.tokenNo || (s.submissionDate ? formatDate(s.submissionDate) : '—')}
                            </td>
                            <td className="py-1 px-2 text-right font-sans">
                              {s.marks !== null && s.marks !== undefined ? (
                                <span className="text-emerald-700 font-bold">{s.marks}/100</span>
                              ) : (
                                <span className="text-amber-700 text-[10px] font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Assign Approved Evaluator
                </label>
                <select
                  value={selectedEvaluatorId}
                  onChange={(e) => setSelectedEvaluatorId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Unassigned (Form packet only) --</option>
                  {evaluators.map((ev) => {
                    const isEligible = ev.eligibleCourses.includes(selectedCourseForPacket);
                    return (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.evaluatorCode}) {isEligible ? '★ Approved for Course' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Dispatch Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cloth envelope dispatched by runner"
                  value={packetNotes}
                  onChange={(e) => setPacketNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  Dispatch slip will open immediately for printing
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPacketModalOpen(false)}
                    className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedCourseScripts.length === 0}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4" />
                    Create & Open Dispatch Slip
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Modify Packet Modal (Admin Only) */}
      {isEditModalOpen && editingPacket && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2 font-bold text-zinc-900 text-sm">
                <Pencil className="w-4 h-4 text-amber-600" />
                Edit Evaluation Packet: {editingPacket.packetNumber}
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPacket(null);
                }}
                className="text-zinc-400 hover:text-zinc-700 text-xs font-bold p-1 rounded-md hover:bg-zinc-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => handleSaveEditSubmit(e, false)} className="mt-4 space-y-4 text-xs overflow-y-auto pr-1">
              {/* Packet Information Card */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-bold text-amber-950 text-sm">
                    {editingPacket.packetNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-zinc-800 border border-amber-300">
                    Cycle: {editingPacket.session}
                  </span>
                </div>
                <div className="text-zinc-600 font-medium">
                  Course: <strong className="text-zinc-900">{editingPacket.courseCode}</strong> ({editingPacket.programmeCode}) • {getCourseTitle(editingPacket.courseCode)}
                </div>
              </div>

              {/* Assign Approved Evaluator */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Assign Approved Evaluator
                </label>
                <select
                  value={editEvaluatorId}
                  onChange={(e) => setEditEvaluatorId(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="">-- Unassigned (Form packet only) --</option>
                  {evaluators.map((ev) => {
                    const isEligible = ev.eligibleCourses.includes(editingPacket.courseCode);
                    return (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.evaluatorCode}) {isEligible ? '★ Approved for Course' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Script Count with validation */}
              <div>
                {(() => {
                  const stats = getCoursePacketStats(editingPacket.courseCode, editingPacket.id);
                  const maxAllowed = editingPacket.scriptCount + stats.availableCount;
                  return (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-zinc-700">
                          Scripts in this Packet <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[11px] text-zinc-500">
                          Max available: <strong className="text-amber-800">{maxAllowed}</strong> (including {stats.availableCount} unassigned)
                        </span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={maxAllowed}
                        value={editScriptCount}
                        onChange={(e) => setEditScriptCount(Math.max(1, Math.min(parseInt(e.target.value, 10) || 1, maxAllowed)))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold text-sm text-zinc-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        required
                      />
                    </>
                  );
                })()}
              </div>

              {/* Packet Status Selector */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Packet Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Formed', 'Dispatched', 'Evaluated'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditPacketStatus(st)}
                      className={`py-2 px-3 rounded-lg font-bold text-xs border text-center transition cursor-pointer ${
                        editPacketStatus === st
                          ? st === 'Evaluated'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : st === 'Dispatched'
                            ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                            : 'bg-zinc-800 text-white border-zinc-900 shadow-2xs'
                          : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expected Return Date */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={editExpectedReturnDate}
                  onChange={(e) => setEditExpectedReturnDate(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Dispatch Notes */}
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Dispatch Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched to faculty runner via cloth parcel"
                  value={editPacketNotes}
                  onChange={(e) => setEditPacketNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleSaveEditSubmit(e, true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Save & Print Slip</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingPacket(null);
                    }}
                    className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Admin Only) */}
      {isDeleteModalOpen && packetToDelete && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-zinc-200 flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 text-sm">
                  Delete Evaluation Packet?
                </h3>
                <span className="font-mono text-xs text-rose-700 font-bold">
                  {packetToDelete.packetNumber}
                </span>
              </div>
            </div>

            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
              <p className="font-semibold">
                Are you sure you want to delete this packet?
              </p>
              <p className="text-[11px] leading-relaxed text-rose-800">
                The <strong>{packetToDelete.scriptCount} script(s)</strong> for Course <strong>{packetToDelete.courseCode}</strong> will be returned to the unassigned pool and can be re-packeted immediately.
              </p>
              <p className="text-[10px] text-zinc-500 pt-1 border-t border-rose-200/60">
                Student intake records, submission receipts, and grades remain completely safe and untouched.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setPacketToDelete(null);
                }}
                className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete & Return to Pool</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Packet Dispatch Slip Modal */}
      <PacketDispatchSlipModal
        isOpen={isDispatchSlipOpen}
        onClose={() => {
          setIsDispatchSlipOpen(false);
          setSelectedPacketForSlip(null);
        }}
        packet={selectedPacketForSlip}
        evaluator={selectedPacketForSlip ? getEvaluatorInfo(selectedPacketForSlip.evaluatorId) : null}
        scripts={slipScripts}
      />
    </div>
  );
};
