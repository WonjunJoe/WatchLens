# Instagram 원시 데이터 분석

> Instagram "내 정보 다운로드" (Download Your Information) ZIP 파일의 구조, 각 데이터 필드의 의미, 인코딩 문제, 그리고 현재 WatchLens의 "소통 균형 분석"에서 데이터가 왜곡되는 원인을 분석한 문서.

---

## 1. ZIP 파일 전체 구조

Instagram 데이터 다운로드 시 JSON 형식을 선택하면 아래와 같은 폴더/파일 구조의 ZIP이 생성된다.

```
instagram-export.zip
├── your_instagram_activity/
│   ├── likes/
│   │   └── liked_posts.json           ← 내가 좋아요 누른 게시물
│   ├── story_interactions/
│   │   └── story_likes.json           ← 내가 좋아요 누른 스토리
│   ├── messages/
│   │   └── inbox/
│   │       ├── username1_20240101/
│   │       │   ├── message_1.json     ← DM 대화 (페이지네이션)
│   │       │   └── message_2.json
│   │       ├── username2_20240315/
│   │       │   └── message_1.json
│   │       └── groupchat_20230501/
│   │           └── message_1.json
│   ├── comments/
│   ├── content/
│   └── ...
├── connections/
│   └── followers_and_following/
│       ├── following.json             ← 내가 팔로우하는 계정
│       ├── followers_1.json           ← 나를 팔로우하는 계정
│       └── recently_unfollowed_profiles.json
├── ads_information/
│   └── ads_and_topics/
│       ├── posts_viewed.json          ← 조회한 게시물
│       └── videos_watched.json        ← 시청한 동영상/릴스
├── preferences/
│   └── your_topics/
│       └── recommended_topics.json    ← 추천 토픽
└── ...
```

### WatchLens에서 사용하는 파일 (`config/settings.py`)

| 키 | 경로 | 용도 |
|---|---|---|
| `liked_posts` | `your_instagram_activity/likes/liked_posts.json` | 좋아요 분석 |
| `story_likes` | `your_instagram_activity/story_interactions/story_likes.json` | 스토리 좋아요 |
| `messages_inbox` | `your_instagram_activity/messages/inbox` | DM 분석 |
| `following` | `connections/followers_and_following/following.json` | 팔로잉 목록 |
| `unfollowed` | `connections/followers_and_following/recently_unfollowed_profiles.json` | 최근 언팔로우 |
| `posts_viewed` | `ads_information/ads_and_topics/posts_viewed.json` | 게시물 조회 |
| `videos_watched` | `ads_information/ads_and_topics/videos_watched.json` | 동영상 시청 |
| `topics` | `preferences/your_topics/recommended_topics.json` | 관심 토픽 |

---

## 2. 각 데이터 파일의 JSON 스키마와 의미

### 2.1 좋아요 (`liked_posts.json`, `story_likes.json`)

```json
[
  {
    "title": "좋아요한_게시물_제목",
    "timestamp": 1704067200,
    "label_values": [
      {
        "dict": [
          {
            "dict": [
              { "label": "\uc0ac\uc6a9\uc790 \uc774\ub984", "value": "johndoe123" }
            ]
          }
        ]
      }
    ]
  }
]
```

**필드 의미:**
- `timestamp`: Unix 시간 (초 단위). 내가 좋아요를 누른 시점.
- `label_values`: 중첩된 딕셔너리 구조. `label`이 `"사용자 이름"`인 항목의 `value`가 **Instagram @username** (예: `johndoe123`).
- **중요**: 여기서 추출되는 것은 **@username** (계정 ID)이지, 표시 이름(Display Name)이 아니다.

**이 데이터가 의미하는 것:**
- "내가 누구의 게시물/스토리에 좋아요를 눌렀는가" — **일방향 데이터**
- 누가 내 게시물에 좋아요를 눌렀는지는 포함되지 않음

### 2.2 DM 메시지 (`messages/inbox/`)

각 대화방은 별도 폴더에 저장되며, 메시지가 많으면 `message_1.json`, `message_2.json` 등으로 페이지네이션된다.

```json
{
  "participants": [
    { "name": "\uc815\uc758\ud5cc" },
    { "name": "\uc870\uc6d0\uc900" }
  ],
  "messages": [
    {
      "sender_name": "\uc815\uc758\ud5cc",
      "timestamp_ms": 1704067200000,
      "content": "\uc548\ub155",
      "type": "Generic",
      "is_geoblocked_for_viewer": false
    }
  ],
  "title": "\uc815\uc758\ud5cc",
  "is_still_participant": true,
  "thread_path": "inbox/username_20240101"
}
```

**필드 의미:**
- `title`: 대화방 이름. **1:1 대화에서는 상대방의 표시 이름(Display Name)**, 그룹 채팅에서는 그룹 이름.
- `participants[].name`: 참여자의 **표시 이름(Display Name)** — @username이 아님!
- `sender_name`: 메시지 발신자의 **표시 이름(Display Name)** — @username이 아님!
- `timestamp_ms`: Unix 시간 (**밀리초** 단위, 다른 파일들과 다름)
- `thread_path`: 폴더 경로. `inbox/영문username_날짜` 형식이지만, 이것도 @username과 정확히 일치하지 않을 수 있음.

**핵심 주의사항:**
| 데이터 | 사용하는 식별자 | 예시 |
|---|---|---|
| liked_posts / story_likes | **@username** | `johndoe123` |
| messages (sender_name) | **표시 이름** | `정의헌` |
| messages (title) | **표시 이름** | `정의헌` |
| following | **@username** (title 필드) | `johndoe123` |

> **@username과 표시 이름은 완전히 다른 식별자**이며, Instagram API 없이는 둘 사이의 매핑이 불가능하다.

### 2.3 팔로잉 (`following.json`)

```json
{
  "relationships_following": [
    {
      "title": "johndoe123",
      "media_list_data": [],
      "string_list_data": [
        {
          "href": "https://www.instagram.com/johndoe123",
          "value": "johndoe123",
          "timestamp": 1704067200
        }
      ]
    }
  ]
}
```

**필드 의미:**
- `title`: **@username**
- `string_list_data[0].href`: 프로필 URL
- `string_list_data[0].value`: **@username** (title과 동일)
- `timestamp`: 팔로우한 시점

### 2.4 콘텐츠 조회 (`posts_viewed.json`, `videos_watched.json`)

```json
[
  {
    "label_values": [
      {
        "dict": [
          {
            "dict": [
              { "label": "\uc0ac\uc6a9\uc790 \uc774\ub984", "value": "creator_username" }
            ]
          }
        ]
      }
    ],
    "timestamp": 1704067200
  }
]
```

- liked_posts와 동일한 `label_values` 구조로 **@username** 추출
- `timestamp`: 조회 시점

### 2.5 토픽 (`recommended_topics.json`)

```json
{
  "topics_your_topics": [
    {
      "string_map_data": {
        "Name": { "value": "Travel" }
      }
    }
  ]
}
```

---

## 3. 인코딩 문제 (Double Encoding)

### 문제 원인

Facebook/Instagram은 JSON 내보내기 시 UTF-8 문자열을 잘못 처리한다. UTF-8 바이트 시퀀스의 각 바이트를 Latin-1 코드포인트로 해석하여 `\uXXXX` 이스케이프 시퀀스로 출력한다.

### 구체적 예시

한글 "정의헌"의 경우:
```
원본 UTF-8 바이트:  EC A0 95  EC 9D 98  ED 97 8C
Instagram JSON:    \uc815   \uc758   \ud5cc     ← 실제로는 각 바이트가 아니라 Unicode 코드포인트
```

그러나 일부 경우 (특히 메시지의 `sender_name`):
```
원본 UTF-8 바이트:  EC A0 95
Instagram JSON:    \u00ec \u00a0 \u0095   ← 각 바이트를 Latin-1로 해석
```

### WatchLens의 처리 (`fix_encoding`)

```python
def fix_encoding(obj):
    """UTF-8 바이트가 Latin-1 코드포인트로 저장된 경우를 복원"""
    if isinstance(obj, str):
        try:
            return obj.encode("latin-1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            return obj  # 이미 정상 인코딩이면 그대로 반환
```

이 함수는 Latin-1로 인코딩 → UTF-8로 디코딩하여 원래 문자열을 복원한다. 이미 정상 인코딩된 문자열은 `encode("latin-1")` 단계에서 예외가 발생하여 원본이 유지된다.

**잠재적 문제:** `fix_encoding`의 성공/실패에 따라 같은 사람의 이름이 다르게 복원될 수 있다. 예를 들어 `sender_name`과 `title`에서 동일 인물의 이름이 서로 다른 인코딩으로 저장되었을 경우, 복원 결과가 달라질 수 있다.

### 언어 의존성 문제

`_extract_username` 함수는 `label`이 `"사용자 이름"`인 항목을 찾는다. 이 라벨은 Instagram 인터페이스 언어에 따라 달라지므로, 영어 설정 사용자의 경우 `"Username"`으로 표시된다. 현재 구현은 **한국어 Instagram 내보내기에만 동작**한다.

---

## 4. 데이터에 포함되지 않는 것 (한계)

Instagram 데이터 다운로드에는 다음 정보가 **포함되지 않는다**:

| 누락 데이터 | 설명 |
|---|---|
| **받은 좋아요** | 누가 내 게시물/스토리에 좋아요를 눌렀는지 |
| **스토리 조회자** | 누가 내 스토리를 봤는지 (14일 후 삭제, 다운로드에 미포함) |
| **팔로워의 활동** | 팔로워가 나에게 보인 관심 (프로필 방문 등) |
| **알고리즘 노출** | 내 콘텐츠가 몇 명에게 노출되었는지 |
| **저장/공유** | 다른 사용자가 내 게시물을 저장/공유한 횟수 |
| **읽음 확인** | DM 읽음 여부 |

> 즉, Instagram 데이터 다운로드는 **"내가 한 행동"만 기록**하며, **"남이 나에게 한 행동"은 거의 포함되지 않는다** (DM 수신 메시지 제외).

---

## 5. "소통 균형 분석" 데이터 왜곡 원인 분석

### 5.1 현재 발생하는 현상

대시보드의 "소통 균형 분석"에서 거의 모든 계정이 극단적인 **"수신 위주"** (받음 >>> 보냄)로 표시된다.

예시:
- @정의헌: 보냄 1, 받음 5,458
- @경민: 보냄 14, 받음 5,265

### 5.2 근본 원인: 식별자 체계 혼용

현재 `compute_ig_engagement_balance` 함수의 로직:

```python
# "보냄" (given) 계산
for item in liked_posts:
    given[item["username"]] += 1       # ← @username (예: "johndoe123")
for item in story_likes:
    given[item["username"]] += 1       # ← @username (예: "johndoe123")
for msg in messages:
    if sender == my_username:
        given[msg["conversation"]] += 1 # ← 표시 이름 (예: "정의헌")

# "받음" (received) 계산
for msg in messages:
    if sender != my_username:
        received[sender] += 1          # ← 표시 이름 (예: "정의헌")
```

**문제:** `given` Counter에 두 종류의 키가 혼재한다:
- 좋아요/스토리: `@username` (예: `johndoe123`)
- DM 발신: `conversation title` = 표시 이름 (예: `정의헌`)

`received` Counter에는:
- DM 수신: `sender_name` = 표시 이름 (예: `정의헌`)

**결과:**

같은 사람 "정의헌" (username: `johndoe123`)에 대해:

| Counter | 키 | 값 | 출처 |
|---|---|---|---|
| `given` | `"johndoe123"` | 5 | 좋아요 5회 |
| `given` | `"정의헌"` | 100 | DM 100건 발신 |
| `received` | `"정의헌"` | 5,458 | DM 5,458건 수신 |

→ 최종 표시: `"johndoe123"` = 보냄 5, 받음 0 (일방적 관심) / `"정의헌"` = 보냄 100, 받음 5,458 (수신 위주)

좋아요 5건이 DM 카운터와 합산되지 않고 별도로 표시되며, DM만 비교하면 자연스럽게 "수신 위주"가 된다.

### 5.3 `_detect_my_username` 문제

```python
def _detect_my_username(messages):
    # 모든 대화에서 가장 많이 등장하는 sender_name을 "나"로 판단
    name_conv_count = Counter()
    for conv, senders in conv_senders.items():
        for s in senders:
            name_conv_count[s] += 1
    return name_conv_count.most_common(1)[0][0]
```

이 로직은 **대부분의 대화방에 참여한 이름**을 찾으므로, 일반적으로 "나"를 올바르게 감지한다. 그러나:

- 반환값이 **표시 이름** (예: "조원준")이므로, 내가 표시 이름을 변경한 경우 일부 오래된 메시지에서는 이전 이름이 사용될 수 있다
- 표시 이름이 다른 사용자와 동일한 경우 오탐 가능

### 5.4 비대칭 데이터 구조

"소통 균형"이라는 개념 자체가 Instagram 데이터의 특성상 **본질적으로 비대칭**이다:

| 방향 | 측정 가능한 데이터 | 측정 불가능한 데이터 |
|---|---|---|
| **내가 → 상대** | 좋아요, 스토리 좋아요, DM 발신, 댓글 | - |
| **상대 → 나** | DM 수신 | 받은 좋아요, 댓글, 스토리 조회, 프로필 방문 |

"받음"에는 DM 수신만 포함되지만, "보냄"에는 좋아요 + 스토리 + DM이 모두 합산된다. 그런데 DM 수신 건수가 워낙 많기 때문에 (활발한 대화 상대는 수천 건), DM 수신이 전체를 지배하게 된다.

### 5.5 그룹 채팅 문제

그룹 채팅에서:
- `conversation title` = 그룹 이름 (예: "대학 동기 모임")
- `sender_name` = 각 참여자의 표시 이름

내가 그룹에 메시지를 보내면 `given["대학 동기 모임"] += 1`이 되지만,
그룹에서 받는 메시지는 `received["정의헌"] += 1`, `received["경민"] += 1` 등으로 분산된다.

→ 그룹 채팅의 received가 각 개인 이름으로 분산되어 개인별 "받음" 수치를 과도하게 부풀린다.

---

## 6. 요약: 왜 "수신 위주"로 보이는가

1. **식별자 불일치**: 좋아요(@username)와 DM(표시 이름)이 서로 다른 키를 사용하여 같은 사람의 데이터가 합산되지 않음
2. **비대칭 데이터**: "받음"은 DM만 카운트하는데, 활발한 대화 상대는 수천 건의 DM을 주고받으므로 숫자가 거대함
3. **그룹 채팅 왜곡**: 그룹 메시지가 각 개인의 "받음"에 분산 합산됨
4. **좋아요 분리**: 내가 누른 좋아요는 @username으로 별도 계정처럼 표시되어, DM 기반 데이터에 합산되지 않음

---

## 7. 수정 방향 제안

### 방법 1: DM 전용 균형 분석으로 전환
- "소통 균형"을 좋아요+DM 혼합이 아닌, **DM 전용**으로 변경
- 이미 `compute_ig_dm_balance`가 대화별 sent/received를 올바르게 계산하고 있음
- 장점: 식별자 불일치 문제 완전 해소
- 단점: 좋아요 데이터를 활용하지 못함

### 방법 2: 식별자 통합 시도
- `messages/inbox/` 폴더 내 `thread_path`에서 @username 추출 시도
- `participants` 정보와 `following` 목록을 크로스레퍼런스하여 표시 이름 → @username 매핑 구축
- 장점: 좋아요 + DM 통합 가능
- 단점: 매핑이 100% 정확하지 않을 수 있음, 구현 복잡도 증가

### 방법 3: 컴포넌트 재설계
- "소통 균형"을 "내가 한 활동 분포"로 리프레이밍
- 상대에게 보낸 좋아요, 스토리 좋아요, DM을 각각 보여주는 구조
- "받음" 개념 자체를 제거 (데이터 특성상 공정한 비교 불가)
- 장점: 데이터 왜곡 없이 의미 있는 인사이트 제공
- 단점: "소통 균형"이라는 원래 의도와 달라짐

---

## 8. 채택한 해결 방향: 방법 1 + 3 조합

### 선택 이유

- "받음"은 DM 수신밖에 없어서 공정한 비교 자체가 불가능 — 좋아요를 아무리 합산해도 비대칭 해소 불가
- 방법 2(식별자 통합)는 Instagram이 @username ↔ 표시 이름 매핑을 제공하지 않아 100% 정확성 보장 불가
- 현실적으로 의미 있는 인사이트: (1) 내가 누구에게 가장 많이 반응하는가, (2) DM에서의 대화 균형

### 구체적 변경 내용

**`engagement_balance` → "내 관심 분포"로 리프레이밍:**
- "보냄 vs 받음" 비교 제거, "받음" 개념 완전 삭제
- 좋아요 / 스토리 좋아요 / DM 발신 세 카테고리로 분리하여 누적 바 차트로 표시
- DM은 1:1 대화만 포함 (`participant_count == 2`), 그룹 채팅 DM 제외
- 반환 타입: `list[dict]` → `dict` (`accounts` 배열 + `total_engagement`)

**`dm_balance`에 그룹 채팅 구분 추가:**
- 각 대화에 `is_group` 필드 추가 (participants > 2명이면 그룹)
- 프론트엔드에서 "그룹" 뱃지 표시

**그 외 개선:**
- `_extract_username`: 한국어 외 영어, 프랑스어, 독일어, 일본어 라벨도 지원 (`_USERNAME_LABELS` set)
- `parse_messages`: `participant_count` 필드 추가 (그룹 채팅 식별용)
- 신규 컴포넌트 null 체크 강화 (DB 캐시 구버전 대응)

---

## 9. 개발 로그

| 날짜 | 작업 | 비고 |
|---|---|---|
| 2026-03-30 | 문제 발견 | 대시보드에서 모든 계정이 극단적 "수신 위주"로 표시됨 |
| 2026-03-30 | 원인 분석 | 식별자 혼용(@username vs 표시이름), 비대칭 데이터, 그룹 채팅 왜곡 세 가지 근본 원인 확인 |
| 2026-03-30 | 본 문서 작성 | Instagram 원시 데이터 구조, 인코딩 문제, 누락 데이터 전체 분석 |
| 2026-03-30 | 방법 1+3 채택 | "받음" 제거, "내 관심 분포"로 리프레이밍 결정 |
| 2026-03-30 | 백엔드 수정 | `compute_ig_engagement_balance` 재설계, `parse_messages`에 participant_count 추가, `_extract_username` 다국어 지원 |
| 2026-03-30 | 프론트엔드 수정 | `IgEngagementBalance` 전면 재작성 (3색 누적 바), `IgDmBalance`에 그룹 뱃지 추가 |
| 2026-03-30 | 크래시 수정 | DB 캐시 구버전(배열)이 신규 컴포넌트(dict 기대)와 충돌 → 방어적 null 체크 추가 |
| 2026-03-30 | 테스트 통과 | parser + stats 17개 테스트 전체 통과, TypeScript 타입 체크 통과 |
