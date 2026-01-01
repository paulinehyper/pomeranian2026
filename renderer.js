/**
 * 1. 상태 관리 변수
 */
    // --- 휴지통 DOM과 이벤트는 최초 1회만 생성/바인딩 ---
    let trash = document.getElementById('todo-trash-bin');
    if (!trash) {
        trash = document.createElement('div');
        trash.id = 'todo-trash-bin';
        trash.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="4" y="7" width="16" height="13" rx="3" fill="#eee" stroke="#888" stroke-width="1.5"/><rect x="9" y="3" width="6" height="4" rx="2" fill="#888"/><path d="M10 11v4" stroke="#888" stroke-width="2"/><path d="M14 11v4" stroke="#888" stroke-width="2"/></svg><div style="color:#888;text-align:center;">여기로 드래그해 삭제</div>';
        trash.style.position = 'fixed';
        trash.style.right = '40px';
        trash.style.bottom = '40px';
        trash.style.zIndex = 9999;
        trash.style.background = '#fff';
        trash.style.border = '2px solid #888';
        trash.style.borderRadius = '16px';
        trash.style.padding = '18px 24px 8px 24px';
        trash.style.boxShadow = '0 4px 16px #0002';
        trash.style.display = 'none';
        document.body.appendChild(trash);
        // 이벤트 리스너 최초 1회만 바인딩
        trash.addEventListener('dragover', (e) => {
            e.preventDefault();
            trash.style.background = '#ffe0e0';
        });
        trash.addEventListener('dragleave', (e) => {
            trash.style.background = '#fff';
        });
        trash.addEventListener('drop', async (e) => {
            trash.style.background = '#fff';
            // 삭제 처리: 드래그 중인 카드 찾기
            const dragging = document.querySelector('li.dragging');
            if (dragging) {
                const id = dragging.getAttribute('data-id');
                if (id && id.startsWith('mail-')) {
                    await window.electronAPI.setEmailTodoFlag(id.replace('mail-', ''), 0);
                } else if (id) {
                    await window.electronAPI.excludeTodo(id);
                }
                refreshDisplay();
            }
        });
    }

    sortedTodos.forEach((item) => {
        const li = document.createElement('li');
        li.setAttribute('draggable', 'true');
        li.setAttribute('data-id', item.id);
        const memo = item.memo || '';
        let isUrgent = false;
        let deadlineHtml = '';

        if (item.deadline && item.deadline !== '없음' && item.deadline !== item.date) {
            deadlineHtml = `<span class="deadline" style="color:#00b49cff;font-weight:bold;margin-right:6px;">마감: ${item.deadline}</span>`;
            const today = new Date(); today.setHours(0,0,0,0);
            const dlDate = new Date(item.deadline); dlDate.setHours(0,0,0,0);
            if (dlDate <= today) isUrgent = true;
        } else {
            deadlineHtml = `<span class="deadline" style="color:#888;font-weight:bold;margin-right:6px;">마감: 없음</span>
                            <input type="date" class="set-deadline-input" style="margin-left:4px;" />
                            <button class="set-deadline-btn">저장</button>`;
        }

        const isCompleted = item.todo_flag === 2;
        li.innerHTML = `
            <button class="todo-x-btn" title="삭제" style="position:absolute;top:6px;right:8px;background:none;border:none;font-size:18px;line-height:1;color:#888;cursor:pointer;z-index:2;">×</button>
            ${deadlineHtml}
            <span class="date">${item.date || ''} </span>
            <span class="d-day">${item.dday || ''}</span>
            <span class="task" style="${isCompleted ? 'text-decoration:line-through;color:#aaa;' : ''}">${item.task}</span>
            <button class="memo-edit-btn" title="메모">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#7affcaff" stroke="#00b49cff" stroke-width="1.5"/><path d="M16 21v-4a1 1 0 0 1 1-1h4" stroke="#00b478ff" fill="#fff"/></svg>
            </button>
            <button class="exclude-btn" title="제외">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="3" fill="#e0e0e0" stroke="#888" stroke-width="1.5"/><path d="M8 12h8" stroke="#888" stroke-width="2"/></svg>
            </button>
            <textarea class="memo" style="display:none;">${memo}</textarea>
            <button class="complete-check-btn" style="display:${isCompleted ? 'inline-block' : 'none'};">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#00b49cff"/><path d="M8 12l3 3 5-5" stroke="#fff" stroke-width="2" fill="none"/></svg>
            </button>
        `;

        // X 버튼 클릭 시 취소선/휴지통 표시
        const xBtn = li.querySelector('.todo-x-btn');
        xBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 모든 카드의 취소선 스타일 복구
            document.querySelectorAll('li .task').forEach(taskEl => {
                taskEl.style.textDecoration = '';
                taskEl.style.color = '';
            });
            li.classList.add('dragging');
            const taskSpan = li.querySelector('.task');
            if (taskSpan) {
                taskSpan.style.textDecoration = 'line-through';
                taskSpan.style.color = '#aaa';
            }
            // 휴지통 표시
            let trash = document.getElementById('todo-trash-bin');
            if (trash) trash.style.display = 'block';

            // 휴지통을 클릭해야 실제 삭제, X버튼 다시 누르면 취소선/휴지통 해제
            function cancelXEffect() {
                li.classList.remove('dragging');
                if (taskSpan) {
                    taskSpan.style.textDecoration = '';
                    taskSpan.style.color = '';
                }
                if (trash) trash.style.display = 'none';
                document.removeEventListener('click', outsideClickHandler, true);
            }
            // 카드 외부 클릭 시 효과 해제
            function outsideClickHandler(ev) {
                if (!li.contains(ev.target) && ev.target !== trash) {
                    cancelXEffect();
                }
            }
            document.addEventListener('click', outsideClickHandler, true);

            // X버튼 다시 누르면 해제
            xBtn.onclick = (ev) => {
                ev.stopPropagation();
                cancelXEffect();
            };
        });

        // --- 드래그 앤 드롭 이벤트 바인딩 ---
        li.addEventListener('dragstart', (e) => {
            // 모든 카드의 취소선 스타일을 먼저 복구(혹시 남아있을 수 있으므로)
            document.querySelectorAll('li .task').forEach(taskEl => {
                taskEl.style.textDecoration = '';
                taskEl.style.color = '';
            });
            li.classList.add('dragging');
            const taskSpan = li.querySelector('.task');
            if (taskSpan) {
                taskSpan.style.textDecoration = 'line-through';
                taskSpan.style.color = '#aaa';
            }
            trash.style.display = 'block';
        });
        li.addEventListener('dragend', (e) => {
            li.classList.remove('dragging');
            // dragend 시 모든 카드의 취소선 스타일을 복구
            document.querySelectorAll('li .task').forEach(taskEl => {
                // 완료된 카드가 아니면 복구
                const parentLi = taskEl.closest('li');
                if (parentLi && !parentLi.classList.contains('completed')) {
                    taskEl.style.textDecoration = '';
                    taskEl.style.color = '';
                }
            });
            trash.style.display = 'none';
        });

        // --- 내부 이벤트 바인딩 ---
        // 마감일 저장
        const saveDlBtn = li.querySelector('.set-deadline-btn');
        if (saveDlBtn) {
            saveDlBtn.onclick = async (e) => {
                e.stopPropagation();
                const dateVal = li.querySelector('.set-deadline-input').value;
                if (!dateVal) return;
                if (typeof item.id === 'string' && item.id.startsWith('mail-')) {
                    await window.electronAPI.setEmailDeadline(item.id.replace('mail-', ''), dateVal);
                } else {
                    await window.electronAPI.setTodoDeadline(item.id, dateVal);
                }
                refreshDisplay();
            };
        }

        // 완료 토글 (글자 클릭)
        li.querySelector('.task').onclick = async () => {
            const currentFlag = item.todo_flag === 2 ? 1 : 2;
            if (typeof item.id === 'string' && item.id.startsWith('mail-')) {
                await window.electronAPI.setEmailTodoFlag(item.id.replace('mail-', ''), currentFlag);
            } else {
                await window.electronAPI.setTodoComplete(item.id, currentFlag);
            }
            refreshDisplay();
        };

        // 메모 필드 토글 및 자동 저장
        const memoArea = li.querySelector('.memo');
        li.querySelector('.memo-edit-btn').onclick = (e) => {
            e.stopPropagation();
            memoArea.style.display = memoArea.style.display === 'none' ? 'block' : 'none';
        };
        memoArea.oninput = (e) => window.electronAPI.saveMemo(item.id, e.target.value);

        // 제외 버튼
        li.querySelector('.exclude-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm('할일 목록에서 제외하시겠습니까?')) {
                if (typeof item.id === 'string' && item.id.startsWith('mail-')) {
                    // 제목에서 단어 분리 후 sentence 타입 keyword로 저장
                    const subject = item.task || '';
                    // 한글, 영문, 숫자 단어 추출 (1글자 이상)
                    const words = (subject.match(/[\p{L}\p{N}]+/gu) || []).map(w => w.trim()).filter(w => w.length > 0);
                    const uniqueWords = [...new Set(words)];
                    for (const word of uniqueWords) {
                        if (word.length > 0) {
                            await window.electronAPI.insertKeyword(word, 'sentence');
                        }
                    }
                    await window.electronAPI.setEmailTodoFlag(item.id.replace('mail-', ''), 0);
                } else {
                    await window.electronAPI.excludeTodo(item.id);
                }
                refreshDisplay();
            }
        };

        if (isUrgent) li.classList.add('urgent-blink');
        list.appendChild(li);
    });
                refreshDisplay();
            };
        }

        // 완료 토글 (글자 클릭)
        li.querySelector('.task').onclick = async () => {
            const currentFlag = item.todo_flag === 2 ? 1 : 2;
            if (typeof item.id === 'string' && item.id.startsWith('mail-')) {
                await window.electronAPI.setEmailTodoFlag(item.id.replace('mail-', ''), currentFlag);
            } else {
                await window.electronAPI.setTodoComplete(item.id, currentFlag);
            }
            refreshDisplay();
        };

        // 메모 필드 토글 및 자동 저장
        const memoArea = li.querySelector('.memo');
        li.querySelector('.memo-edit-btn').onclick = (e) => {
            e.stopPropagation();
            memoArea.style.display = memoArea.style.display === 'none' ? 'block' : 'none';
        };
        memoArea.oninput = (e) => window.electronAPI.saveMemo(item.id, e.target.value);

        // 제외 버튼
        li.querySelector('.exclude-btn').onclick = async (e) => {
            e.stopPropagation();
            if (confirm('할일 목록에서 제외하시겠습니까?')) {
                if (typeof item.id === 'string' && item.id.startsWith('mail-')) {
                    // 제목에서 단어 분리 후 sentence 타입 keyword로 저장
                    const subject = item.task || '';
                    // 한글, 영문, 숫자 단어 추출 (1글자 이상)
                    const words = (subject.match(/[\p{L}\p{N}]+/gu) || []).map(w => w.trim()).filter(w => w.length > 0);
                    const uniqueWords = [...new Set(words)];
                    for (const word of uniqueWords) {
                        if (word.length > 0) {
                            await window.electronAPI.insertKeyword(word, 'sentence');
                        }
                    }
                    await window.electronAPI.setEmailTodoFlag(item.id.replace('mail-', ''), 0);
                } else {
                    await window.electronAPI.excludeTodo(item.id);
                }
                refreshDisplay();
            }
        };

        if (isUrgent) li.classList.add('urgent-blink');
        list.appendChild(li);
    });
}

/**
 * 4. 전역 갱신 함수 (refreshDisplay)
 */
async function refreshDisplay() {
    if (isRefreshing) return;
    isRefreshing = true;

    try {
        console.log('[%s] 데이터 로드 시작...', new Date().toLocaleTimeString());
        const todos = await window.electronAPI.getTodos();
        console.log('수신 데이터:', todos);
        
        if (Array.isArray(todos)) {
            renderList(todos);
        }
    } catch (err) {
        console.error('갱신 실패:', err);
    } finally {
        isRefreshing = false;
    }
}

/**
 * 5. 앱 초기화 (이벤트 리스너 통합)
 */
document.addEventListener('DOMContentLoaded', () => {
    // A. 초기 즉시 실행 및 주기적 타이머(1분)
    refreshDisplay();
    setInterval(refreshDisplay, 60000);

    // ===== 할일 마감 알림 주기적 팝업 =====
    function showTodoAlarmPopup(msg) {
        // 이미 떠있는 팝업이 있으면 중복 방지
        if (document.getElementById('todo-alarm-popup')) return;
        const popup = document.createElement('div');
        popup.id = 'todo-alarm-popup';
        popup.style.position = 'fixed';
        popup.style.right = '32px';
        popup.style.bottom = '32px';
        popup.style.background = '#fff';
        popup.style.border = '2px solid #000000';
        popup.style.borderRadius = '12px';
        popup.style.boxShadow = '0 4px 16px #00000033';
        popup.style.padding = '22px 32px 18px 32px';
        popup.style.zIndex = 9999;
        popup.style.fontSize = '1.08em';
        popup.style.color = '#0093b4';
        popup.innerHTML = `<b style='color:#000000;'>할일 알림</b><br><div style='margin:10px 0 0 0;'>${msg}</div><button id='close-todo-alarm' style='margin-top:14px;background:#000000;color:#fff;border:none;padding:6px 18px;border-radius:7px;font-size:1em;cursor:pointer;'>닫기</button>`;
        document.body.appendChild(popup);
        document.getElementById('close-todo-alarm').onclick = () => popup.remove();
        setTimeout(() => { if (popup.parentNode) popup.remove(); }, 12000); // 12초 후 자동 닫힘
    }

    async function checkTodoAlarms() {
        // 설정값 불러오기
        const interval = parseInt(localStorage.getItem('todoAlarmInterval') || '10', 10); // 분
        const dDay = parseInt(localStorage.getItem('todoAlarmDay') || '1', 10); // ex: 1이면 D-1
        if (!interval || !dDay) return;
        const todos = await window.electronAPI.getTodos();
        if (!Array.isArray(todos)) return;
        const today = new Date(); today.setHours(0,0,0,0);
        const alarmList = [];
        // 흔들림 효과를 줄 카드 id 목록
        const shakeIds = [];
        for (const t of todos) {
            if (!t.deadline || t.deadline === '없음') continue;
            const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
            const diff = Math.floor((dl - today) / (1000*60*60*24));
            const isMail = typeof t.id === 'string' && t.id.startsWith('mail-');
            // D-설정값 이하(예: 3 입력 시 D-3, D-2, D-1, 오늘까지 모두 알림)
            if (diff >= 0 && diff <= dDay) {
                alarmList.push(`${isMail ? '[메일] ' : ''}${t.task} 마감까지 D-${diff} (${t.deadline})`);
                shakeIds.push(t.id);
            }
        }
        // 카드 흔들림 효과 적용
        if (shakeIds.length > 0) {
            setTimeout(() => {
                shakeIds.forEach(id => {
                    // id가 mail-로 시작하면 mail-, 아니면 숫자
                    const selector = typeof id === 'string' ? `[data-id="${id}"]` : `[data-id="${id}"]`;
                    const card = document.querySelector(selector);
                    if (card) {
                        card.classList.add('shake');
                        setTimeout(() => card.classList.remove('shake'), 1200);
                    }
                });
            }, 100);
        }
        if (alarmList.length > 0) {
            showTodoAlarmPopup(alarmList.join('<br>'));
        }
    // 흔들림 애니메이션 CSS 추가
    const shakeStyle = document.createElement('style');
    shakeStyle.innerHTML = `
    .shake {
        animation: shakeAnim 0.6s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes shakeAnim {
        10%, 90% { transform: translateX(-2px); }
        20%, 80% { transform: translateX(4px); }
        30%, 50%, 70% { transform: translateX(-8px); }
        40%, 60% { transform: translateX(8px); }
    }
    `;
    document.head.appendChild(shakeStyle);
    }

    // 알림 타이머 관리 변수
    window.todoAlarmTimerId = null;
    window.startTodoAlarmTimer = function startTodoAlarmTimer() {
        if (window.todoAlarmTimerId) clearInterval(window.todoAlarmTimerId);
        const interval = parseInt(localStorage.getItem('todoAlarmInterval') || '10', 10);
        if (!interval) return;
        window.todoAlarmTimerId = setInterval(checkTodoAlarms, interval * 60000);
    }

    // 최초 10초 후, 이후 설정 간격(분)마다 반복
    setTimeout(() => {
        checkTodoAlarms();
        startTodoAlarmTimer();
    }, 10000);

    // B. 설정(톱니바퀴) 아이콘
    const cogBtn = document.querySelector('.cog-btn');
    if (cogBtn) cogBtn.onclick = () => window.electronAPI.openAppSettings();

    // C. 할일 추가 모달
    const fab = document.getElementById('add-todo-fab');
    const modal = document.getElementById('add-todo-modal');
    const taskInput = document.getElementById('add-todo-task');
    const deadlineInput = document.getElementById('add-todo-deadline');

    if (fab) {
        fab.onclick = () => {
            modal.style.display = 'flex';
            taskInput.value = '';
            deadlineInput.value = '';
            setTimeout(() => taskInput.focus(), 100);
        };
    }
    const saveTodoBtn = document.getElementById('save-add-todo');
    if (saveTodoBtn) {
        saveTodoBtn.onclick = async () => {
            const task = taskInput.value.trim();
            if (!task) return;
            await window.electronAPI.insertTodo({ task, deadline: deadlineInput.value });
            modal.style.display = 'none';
            refreshDisplay();
        };
    }

    // D. 완료된 목록 보기
    const completedBtn = document.querySelector('.completed-btn');
    const completedModal = document.getElementById('completed-modal');
    if (completedBtn) {
        completedBtn.onclick = async () => {
            const completed = await fetchCompletedTodos();
            const list = document.getElementById('completed-list');
            list.innerHTML = completed.map(t => `
                <li style="margin-bottom:8px;">
                    <span style="text-decoration:line-through;color:#aaa;">${t.task}</span> 
                    <span style="color:#b48a00;">${t.deadline ? '('+t.deadline+')' : ''}</span>
                </li>
            `).join('') || '<li style="color:#888;">완료된 할일이 없습니다.</li>';
            completedModal.style.display = 'flex';
        };
    }

    // E. 이메일 동기화 (연동하기) 버튼
    const syncBtn = document.querySelector('.settings-btn');
    if (syncBtn) {
        syncBtn.onclick = async () => {
            const settings = await window.electronAPI.getMailSettings();
            if (!settings) { window.electronAPI.openAppSettings(); return; }
            
            const result = await window.electronAPI.mailConnect(settings);
            if (result && result.success) {
                console.log('메일 동기화 성공');
                refreshDisplay();
            }
        };
    }

    // F. 전체 삭제 버튼 생성 및 삽입
    const headerRight = document.querySelector('.header-right');
    if (headerRight) {
        const delAllBtn = document.createElement('button');
        delAllBtn.innerHTML = '전체삭제';
        delAllBtn.className = 'delete-all-btn';
        // 중복 방지를 위해 기존 버튼 삭제 후 삽입
        const existingDel = headerRight.querySelector('.delete-all-btn');
        if (existingDel) existingDel.remove();
        
        headerRight.prepend(delAllBtn);
        delAllBtn.onclick = async () => {
            if (confirm('정말 전체 할일을 삭제하시겠습니까?')) {
                await window.electronAPI.deleteAllTodos();
                refreshDisplay();
            }
        };
    }

    // G. 메인 프로세스 실시간 신호 감지
    if (window.electronAPI.onNewTodoAdded) {
        window.electronAPI.onNewTodoAdded(() => {
            console.log('실시간 신호 수신됨');
            refreshDisplay();
        });
    }
});