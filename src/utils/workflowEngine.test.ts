import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStepSubtaskStats,
  resolveActivePath,
  addSubtaskToStep,
  selectSituationBranch,
  advanceToNextStep,
  addBranchToStep,
  calculateWorkflowProgress,
  createNewWorkflow,
  computeFlowchartLayout,
  generateWorkflowFromStepsText,
  updateBranchTarget,
  deleteStepFromWorkflow,
  serializeWorkflowToJson,
  parseImportedWorkflowJson,
} from './workflowEngine';
import { INITIAL_WORKFLOWS } from './seedWorkflows';

test('flow navigation moves directly to the next step along the selected situational branch without requiring checkbox completion', () => {
  const wf = structuredClone(INITIAL_WORKFLOWS[0]);
  const rootStep = wf.steps[wf.rootStepId];

  const stats = getStepSubtaskStats(rootStep);
  assert.equal(stats.canProceed, true);
  assert.equal(stats.total, 4);

  // Can immediately advance from step-triage to step-rollback without clicking subtask checkboxes
  const attempt = advanceToNextStep(wf, wf.rootStepId);
  assert.equal(attempt.success, true);
  assert.equal(attempt.workflow.currentStepId, 'step-rollback');
});

test('all steps in the active situational path are unlocked for immediate flow building and inspection', () => {
  const wf = structuredClone(INITIAL_WORKFLOWS[0]);
  const path = resolveActivePath(wf);
  assert.equal(path.length, 3);
  assert.equal(path[0].step.id, 'step-triage');
  assert.equal(path[1].step.id, 'step-rollback');
  assert.equal(path[2].step.id, 'step-postmortem');
  assert.ok(path.every((node) => node.isUnlocked === true));
});

test('switching situational branch dynamically reroutes the subsequent steps in active path', () => {
  let wf = structuredClone(INITIAL_WORKFLOWS[0]);

  // Default path goes: step-triage -> step-rollback -> step-postmortem
  const initialPath = resolveActivePath(wf);
  assert.deepEqual(
    initialPath.map((p) => p.step.id),
    ['step-triage', 'step-rollback', 'step-postmortem']
  );

  // Switch step-triage branch to 'br-db-infra' (Database/Infra bottleneck)
  wf = selectSituationBranch(wf, 'step-triage', 'br-db-infra');
  const reroutedPath = resolveActivePath(wf);
  assert.deepEqual(
    reroutedPath.map((p) => p.step.id),
    ['step-triage', 'step-infra-mitigation', 'step-postmortem']
  );

  // Switch step-triage branch to 'br-false-alarm' (False alarm -> directly to postmortem)
  wf = selectSituationBranch(wf, 'step-triage', 'br-false-alarm');
  const shortPath = resolveActivePath(wf);
  assert.deepEqual(
    shortPath.map((p) => p.step.id),
    ['step-triage', 'step-postmortem']
  );
});

test('adding sub-steps, relinking branch targets, and deleting steps updates workflow structure cleanly', () => {
  let wf = structuredClone(INITIAL_WORKFLOWS[0]);

  // Add a sub-step to step-triage
  wf = addSubtaskToStep(
    wf,
    'step-triage',
    'Ghi nhận biểu đồ tải hệ thống vào hồ sơ sự cố',
    true
  );
  assert.equal(wf.steps['step-triage'].subtasks.length, 5);

  // Re-point 'br-rollback' directly to 'step-postmortem'
  wf = updateBranchTarget(wf, 'step-triage', 'br-rollback', 'step-postmortem');
  const updatedPath = resolveActivePath(wf);
  assert.deepEqual(
    updatedPath.map((p) => p.step.id),
    ['step-triage', 'step-postmortem']
  );

  // Delete 'step-rollback' from workflow
  wf = deleteStepFromWorkflow(wf, 'step-rollback');
  assert.equal(Boolean(wf.steps['step-rollback']), false);
  assert.equal(Object.keys(wf.steps).length, 3);
});

test('adding a custom situational branch with a new target step creates and routes to that step', () => {
  let wf = structuredClone(INITIAL_WORKFLOWS[0]);
  wf = addBranchToStep(wf, 'step-triage', {
    label: 'Tình huống D: Tấn công DDoS từ bên ngoài',
    conditionDescription: 'Lưu lượng truy cập tăng đột biến gấp 20 lần từ dải IP lạ.',
    actionGuidance: 'Kích hoạt tường lửa WAF Chế độ Under Attack ngay lập tức.',
    targetMode: 'new',
    newStepTitle: 'Kích hoạt Tường lửa WAF & Lọc IP Tấn công',
    newStepDescription: 'Chặn dải IP bất thường và bật xác thực Captcha tại biên.',
    newStepRole: 'Kỹ sư An ninh Mạng (SecOps)',
    newStepSubtasks: [
      'Bật chế độ chặn DDoS tự động trên Cloudflare / WAF',
      'Cập nhật danh sách chặn IP (Blocklist) tại Firewall',
    ],
  });

  const path = resolveActivePath(wf);
  assert.equal(path.length, 2);
  assert.equal(path[1].step.title, 'Kích hoạt Tường lửa WAF & Lọc IP Tấn công');
  assert.equal(path[1].step.subtasks.length, 2);

  const progress = calculateWorkflowProgress(wf);
  assert.equal(progress.activeStepsCount, 2);
});

test('defining a new custom workflow with subtasks and conditional branches builds a valid graph', () => {
  const customWf = createNewWorkflow({
    title: 'Quy trình Phê duyệt Hợp đồng Mua sắm',
    category: 'Tài chính & Mua sắm',
    description: 'Kiểm tra báo giá và rẽ nhánh phê duyệt theo giá trị hợp đồng.',
    rootStepTitle: 'Thẩm định Hồ sơ Nhà cung cấp & Báo giá',
    rootStepDescription: 'Thu thập tối thiểu 3 báo giá cạnh tranh.',
    rootStepOwner: 'Chuyên viên Mua sắm',
    rootSubtasks: [
      'Kiểm tra giấy phép kinh doanh của nhà cung cấp',
      'Đối chiếu bảng so sánh 3 báo giá độc lập',
    ],
    secondStepTitle: 'Trình Trưởng phòng Mua sắm phê duyệt nhanh',
    secondStepConditionLabel: 'Giá trị dưới 100 triệu VNĐ',
    altStepTitle: 'Hội đồng Đấu thầu & Ban Giám đốc thẩm định',
    altStepConditionLabel: 'Giá trị từ 100 triệu VNĐ trở lên',
  });

  const defaultPath = resolveActivePath(customWf);
  assert.equal(defaultPath.length, 2);
  assert.equal(defaultPath[0].step.subtasks.length, 2);
  assert.equal(defaultPath[1].step.title, 'Trình Trưởng phòng Mua sắm phê duyệt nhanh');

  // Switch to high-value contract branch
  const altBranch = customWf.steps[customWf.rootStepId].branches[1];
  const switchedWf = selectSituationBranch(customWf, customWf.rootStepId, altBranch.id);
  const altPath = resolveActivePath(switchedWf);
  assert.equal(altPath[1].step.title, 'Hội đồng Đấu thầu & Ban Giám đốc thẩm định');
});

test('generateWorkflowFromStepsText parses user-listed steps, subtasks, and branches and computes flowchart layout', () => {
  const rawStepsText = `
Bước 1: Tiếp nhận yêu cầu bảo hành
- Kiểm tra tem niêm phong và số Serial
- Chụp ảnh tình trạng thiết bị khi nhận
-> Lỗi phần mềm nhẹ: Cập nhật Firmware và bàn giao ngay
-> Hỏng linh kiện phần cứng: Chuyển Trung tâm Kỹ thuật thay linh kiện

Bước 2: Cập nhật Firmware và bàn giao ngay
- Chạy công cụ chẩn đoán phần mềm
- Khởi động lại và kiểm tra ổn định

Bước 3: Chuyển Trung tâm Kỹ thuật thay linh kiện
- Lập phiếu xuất kho linh kiện thay thế
- Kiểm tra an toàn điện sau khi lắp ráp
`;

  const generated = generateWorkflowFromStepsText({
    title: 'Quy trình Bảo hành Thiết bị',
    category: 'Dịch vụ Kỹ thuật',
    rawStepsText,
  });

  const allSteps = Object.values(generated.steps);
  assert.equal(allSteps.length, 3);

  const root = generated.steps[generated.rootStepId];
  assert.equal(root.title, 'Tiếp nhận yêu cầu bảo hành');
  assert.equal(root.subtasks.length, 2);
  assert.equal(root.branches.length, 2);

  const layout = computeFlowchartLayout(generated);
  assert.equal(layout.nodes.length, 3);
  assert.ok(layout.edges.length >= 4);
  assert.ok(layout.canvasWidth >= 860);
  assert.ok(layout.canvasHeight > 200);
});

test('computeFlowchartLayout places child steps strictly below parent steps, expands clicked items, and routes bypass edges outside step boxes', () => {
  const wf = structuredClone(INITIAL_WORKFLOWS[0]);
  const layout = computeFlowchartLayout(wf, {
    expandedStepId: 'step-triage',
    expandedBranchId: 'br-triage-db',
  });

  const nodeMap = new Map(layout.nodes.map((n) => [n.step.id, n]));
  const triage = nodeMap.get('step-triage')!;
  const rollback = nodeMap.get('step-rollback')!;
  const infra = nodeMap.get('step-infra-mitigation')!;
  const postmortem = nodeMap.get('step-postmortem')!;

  assert.ok(triage.level < rollback.level);
  assert.ok(rollback.level < infra.level);
  assert.ok(infra.level < postmortem.level);
  assert.ok(
    triage.height > rollback.height,
    'Expanded step box should be taller to show all sub-steps'
  );
  assert.ok(
    rollback.y > triage.y + triage.height + 100,
    'Row below expanded step box should be pushed down with ample corridor room'
  );

  // Verify no edge label center sits inside any step node's bounding box
  for (const edge of layout.edges) {
    for (const node of layout.nodes) {
      const insideX =
        edge.labelX >= node.x - 20 && edge.labelX <= node.x + node.width + 20;
      const insideY =
        edge.labelY >= node.y - 10 && edge.labelY <= node.y + node.height + 10;
      assert.equal(
        insideX && insideY,
        false,
        `Edge label "${edge.branch.label}" collided with node "${node.step.code}"`
      );
    }
  }
});

test('serializeWorkflowToJson and parseImportedWorkflowJson export and restore workflow data with usage guide', () => {
  const wf = structuredClone(INITIAL_WORKFLOWS[0]);
  const exported = serializeWorkflowToJson(wf);

  assert.ok(exported.filename.endsWith('.json'));
  assert.ok(exported.filename.startsWith('flowops-'));
  assert.equal(exported.packageData.schemaVersion, '1.0');
  assert.ok(exported.packageData.usageGuide.purpose.length > 10);
  assert.ok(exported.packageData.usageGuide.howToBackup.length > 10);
  assert.ok(exported.packageData.usageGuide.howToShare.length > 10);
  assert.ok(exported.packageData.usageGuide.howToRestore.length > 10);

  const restored = parseImportedWorkflowJson(exported.jsonContent);
  assert.equal(restored.title, wf.title);
  assert.equal(restored.rootStepId, wf.rootStepId);
  assert.equal(
    Object.keys(restored.steps).length,
    Object.keys(wf.steps).length
  );
});

