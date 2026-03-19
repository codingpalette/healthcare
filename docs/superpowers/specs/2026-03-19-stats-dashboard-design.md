# 통계 대시보드 확장 설계

## 개요
트레이너 전용 통계 페이지(`/stats`)를 탭 기반 구조로 리뉴얼하여, 기존 접속 통계 외에 출석/회원/식단/운동/인바디 통계를 추가한다.

## 의사결정 요약

| 항목 | 결정 |
|------|------|
| 대상 사용자 | 트레이너 전용 |
| 레이아웃 | 탭 전환 방식 (6개 탭) |
| 데이터 조회 기간 | 통계마다 적절한 기간 설정 |
| 구현 방식 | 백엔드 집계 API (Hono 라우트) |

## 페이지 구조

### 탭 구성

| 탭 | 기간 옵션 | 이유 |
|---|---|---|
| 접속 | 7일 / 30일 | 기존 유지 |
| 출석 | 7일 / 30일 / 90일 | 주간~분기 출석 패턴 |
| 회원 | 30일 / 90일 / 1년 | 가입/유지율은 긴 기간이 의미 있음 |
| 식단 | 7일 / 30일 | 일상적 기록 추적 |
| 운동 | 7일 / 30일 | 일상적 기록 추적 |
| 인바디 | 3개월 / 6개월 / 1년 | 측정 주기가 길어서 |

- shadcn `Tabs` 컴포넌트 사용
- URL 동기화: `/stats?tab=attendance` 쿼리 파라미터로 탭 상태 유지

---

## 탭별 상세 설계

### 1. 접속 통계 (기존)

기존 `DailyAccessChart` 위젯 그대로 유지. 변경 없음.

---

### 2. 출석 통계

#### 2-1. 요약 카드 (상단)
- **오늘 출석자 수** — 어제 대비 증감 표시
- **기간 평균 출석률** — 전체 회원 중 출석한 비율

#### 2-2. 출석률 추이 차트 (중단)
- **AreaChart** — 일별 출석률 추이 (7일/30일/90일 토글)
- X축: 날짜, Y축: 출석률(%) 또는 출석자 수

#### 2-3. 요일별 분포 + 회원 랭킹 (하단, 2컬럼)
- **왼쪽: BarChart** — 요일별(월~일) 평균 출석자 수
- **오른쪽: 테이블** — 출석률 상위/하위 회원 랭킹 (이름, 출석률%, 출석일수)

#### API
```
GET /api/stats/attendance?days=30
```
```typescript
interface AttendanceStats {
  today: number
  yesterday: number
  totalMembers: number
  dailyData: { date: string; count: number; rate: number }[]
  weekdayData: { weekday: number; avgCount: number }[]  // 0=일, 1=월...6=토
  memberRanking: { userId: string; name: string; attendanceRate: number; totalDays: number }[]
}
```

---

### 3. 회원 통계

#### 3-1. 요약 카드 (상단)
- **전체 회원 수** — 활성/비활성 비율 표시
- **이번 달 신규 가입** — 전월 대비 증감

#### 3-2. 신규 가입 추이 차트 (중단)
- **BarChart** — 신규 가입자 수 (30일/90일/1년 토글)
- 30일일 때 일별, 90일/1년일 때 월별 집계

#### 3-3. 회원 유지율 + 비활성 회원 (하단, 2컬럼)
- **왼쪽: LineChart** — 월별 유지율 추이
- **오른쪽: 리스트** — 비활성 회원 목록 (최근 30일 출석 0인 회원)

활성/비활성 기준: 최근 30일 내 출석 기록 유무

#### API
```
GET /api/stats/members?days=90
```
```typescript
interface MemberStats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  newThisMonth: number
  newLastMonth: number
  signupTrend: { date: string; count: number }[]
  retentionTrend: { month: string; rate: number }[]
  inactiveList: { userId: string; name: string; lastAttendance: string | null }[]
}
```

---

### 4. 식단 통계

#### 4-1. 요약 카드 (상단)
- **오늘 식단 제출률** — 어제 대비 증감
- **기간 평균 제출률**

#### 4-2. 제출률 추이 + 영양소 추이 (중단, 2컬럼)
- **왼쪽: AreaChart** — 일별 식단 제출률 추이
- **오른쪽: LineChart** — 전체 회원 평균 칼로리/탄단지 일별 추이 (멀티 라인, 토글로 영양소 선택)

#### 4-3. 회원별 성실도 (하단)
- **테이블** — 회원별 식단 기록 성실도 (이름, 제출률%, 평균 칼로리, 최근 기록일)
- 제출률 기준 정렬, 미제출 회원 하이라이트

#### API
```
GET /api/stats/diet?days=30
```
```typescript
interface DietStats {
  todaySubmitRate: number
  yesterdaySubmitRate: number
  avgSubmitRate: number
  totalMembers: number
  dailyData: { date: string; submitCount: number; submitRate: number; avgCalories: number; avgCarbs: number; avgProtein: number; avgFat: number }[]
  memberStats: { userId: string; name: string; submitRate: number; avgCalories: number; lastRecordDate: string | null }[]
}
```

---

### 5. 운동 통계

#### 5-1. 요약 카드 (상단)
- **오늘 운동 기록률** — 어제 대비 증감
- **기간 평균 기록률**

#### 5-2. 기록률 추이 + 운동 분포 (중단, 2컬럼)
- **왼쪽: AreaChart** — 일별 운동 기록률 추이
- **오른쪽: BarChart (가로)** — 운동명별 빈도 분포 상위 10개

#### 5-3. 회원별 운동 빈도 (하단)
- **테이블** — 회원별 운동 빈도 (이름, 기록률%, 총 운동 횟수, 가장 많이 한 운동, 최근 기록일)

#### API
```
GET /api/stats/workout?days=30
```
```typescript
interface WorkoutStats {
  todayRecordRate: number
  yesterdayRecordRate: number
  avgRecordRate: number
  totalMembers: number
  dailyData: { date: string; recordCount: number; recordRate: number }[]
  exerciseDistribution: { exerciseName: string; count: number }[]
  memberStats: { userId: string; name: string; recordRate: number; totalWorkouts: number; topExercise: string | null; lastRecordDate: string | null }[]
}
```

---

### 6. 인바디 통계

#### 6-1. 요약 카드 (상단)
- **이번 달 측정률** — 전체 회원 중 이번 달 측정한 비율
- **미측정 회원 수**

#### 6-2. 전체 회원 평균 추이 (중단)
- **LineChart (멀티 라인)** — 월별 평균 체중/골격근량/체지방률 추이 (3개월/6개월/1년 토글)
- 버튼으로 지표 선택

#### 6-3. 회원별 비교 (중하단)
- **드롭다운으로 회원 2~3명 선택** → 선택한 회원의 변화 추이를 한 차트에 오버레이
- LineChart, 회원별 다른 색상
- 데이터: 기존 `/api/inbody/members/:id` API를 클라이언트에서 복수 호출하여 조합 (전용 API 불필요)

#### 6-4. 측정 관리 테이블 (하단)
- **테이블** — 회원별 측정 현황 (이름, 최근 측정일, 최근 체중/골격근/체지방, 이번 달 측정 여부)
- 미측정 회원 상단 하이라이트

#### API
```
GET /api/stats/inbody?months=6
```
```typescript
interface InbodyStats {
  totalMembers: number
  measuredThisMonth: number
  unmeasuredThisMonth: number
  monthlyAvgTrend: { month: string; avgWeight: number | null; avgMuscleMass: number | null; avgBodyFatPct: number | null }[]
  memberOverview: { userId: string; name: string; lastMeasuredDate: string | null; latestWeight: number | null; latestMuscleMass: number | null; latestBodyFatPct: number | null; measuredThisMonth: boolean }[]
}
```

---

## 아키텍처

### FSD 레이어 구조

```
entities/stats/
├── model/types.ts        # 모든 통계 응답 타입 정의 (기존 + 신규 5개)
├── api/stats-api.ts      # 통계 API 호출 함수 (기존 + 신규 5개)
└── index.ts

features/stats/
├── model/use-stats.ts    # React Query 훅 (기존 + 신규 5개)
└── index.ts

widgets/stats/
├── daily-access-chart.tsx          # 기존 유지
├── attendance-stats.tsx            # 신규
├── member-stats.tsx                # 신규
├── diet-stats.tsx                  # 신규
├── workout-stats.tsx               # 신규
├── inbody-stats.tsx                # 신규
└── index.ts

views/stats/
└── ui/StatsPage.tsx                # 탭 구조로 리뉴얼
```

### API 라우트

```
src/app/api/routes/stats.ts
  GET /api/stats/daily-access       # 기존
  GET /api/stats/attendance         # 신규
  GET /api/stats/members            # 신규
  GET /api/stats/diet               # 신규
  GET /api/stats/workout            # 신규
  GET /api/stats/inbody             # 신규
```

### 공통 패턴
- **권한:** 모든 통계 API는 트레이너 전용 (기존 role check 패턴)
- **캐싱:** TanStack Query `staleTime: 5분`
- **차트:** Recharts + shadcn ChartContainer
- **로딩/에러:** Skeleton + 에러 카드 (기존 DailyAccessChart 패턴)

### 신규 파일 요약
- **타입:** 5개 인터페이스 추가 (`entities/stats/model/types.ts`)
- **API 함수:** 5개 추가 (`entities/stats/api/stats-api.ts`)
- **훅:** 5개 추가 (`features/stats/model/use-stats.ts`)
- **위젯:** 5개 신규 파일 (`widgets/stats/`)
- **페이지:** `StatsPage.tsx` 리뉴얼 (기존 파일 수정)
- **API 라우트:** `stats.ts`에 5개 엔드포인트 추가

---

## 구현 참고사항

### 1. 데이터 범위 (트레이너 스코핑)
- 기존 `daily-access` API와 동일하게, 트레이너가 시스템 전체 회원 데이터를 조회하는 방식 유지
- `adminSupabase`를 사용하여 RLS 바이패스 (기존 패턴)
- 추후 멀티 트레이너 환경에서 `trainer_id` 기반 필터링이 필요하면 별도 확장

### 2. "활성 회원" 정의
- 순수 출석 기반: **최근 30일 내 출석 기록 유무**로 판단
- 회원권 만료 여부는 별도 관리 (memberships 테이블)이므로 통계에서는 출석 기준만 사용

### 3. 회원 목록 페이지네이션
- 초기 구현: 랭킹/목록은 상위 20명으로 제한 (`LIMIT 20`)
- 추후 필요 시 `offset`/`limit` 파라미터 추가

### 4. 식단 "제출률" 계산 기준
- **해당 날짜에 1건 이상 식단 기록이 있으면 "제출"로 간주**
- 끼니별(아침/점심/저녁/간식) 전부 기록할 필요 없음

### 5. React Query staleTime
- 모든 통계 훅에 `staleTime: 5 * 60 * 1000` (5분) 설정
- 기존 `useDailyAccessStats`에도 동일하게 추가하여 일관성 유지
