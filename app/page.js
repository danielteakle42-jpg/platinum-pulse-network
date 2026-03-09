"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import * as XLSX from "xlsx"

const INCENTIVE_DAYS_TARGET = 8
const INCENTIVE_HOURS_TARGET = 20
const INCENTIVE_PERIOD_DAYS = 30
const STORAGE_KEY = "ppn_creators_data_v1"

const defaultCreators = [
  {
    id: 1,
    creatorId: "7614187880910471184",
    username: "shanie.louise",
    avatar: "/logo.png",
    diamonds: 0,
    validLiveDays: 0,
    liveMinutes: 0,
    eligibleIncentiveDays: 26,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
  {
    id: 2,
    creatorId: "7607536558354317328",
    username: "chaossprout",
    avatar: "/logo.png",
    diamonds: 145,
    validLiveDays: 3,
    liveMinutes: 5 * 60 + 35,
    eligibleIncentiveDays: 31,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
  {
    id: 3,
    creatorId: "7614169302706487297",
    username: "jas_priv34",
    avatar: "/logo.png",
    diamonds: 0,
    validLiveDays: 0,
    liveMinutes: 0,
    eligibleIncentiveDays: 26,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
  {
    id: 4,
    creatorId: "7614860370460737553",
    username: "harleyquin057",
    avatar: "/logo.png",
    diamonds: 0,
    validLiveDays: 0,
    liveMinutes: 0,
    eligibleIncentiveDays: 24,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
  {
    id: 5,
    creatorId: "7607595546672496657",
    username: "d4navar",
    avatar: "/logo.png",
    diamonds: 0,
    validLiveDays: 0,
    liveMinutes: 0,
    eligibleIncentiveDays: 31,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
  {
    id: 6,
    creatorId: "0000000000000000006",
    username: "dolphinteddybear",
    avatar: "/logo.png",
    diamonds: 132,
    validLiveDays: 0,
    liveMinutes: 1 * 60 + 3,
    eligibleIncentiveDays: 27,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
  {
    id: 7,
    creatorId: "7614194914745745424",
    username: "keytok58",
    avatar: "/logo.png",
    diamonds: 117,
    validLiveDays: 2,
    liveMinutes: 9 * 60 + 15,
    eligibleIncentiveDays: 26,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
  {
    id: 8,
    creatorId: "7613757241828589569",
    username: "alishaesme",
    avatar: "/logo.png",
    diamonds: 125,
    validLiveDays: 2,
    liveMinutes: 4 * 60 + 24,
    eligibleIncentiveDays: 27,
    level: "Level 1",
    estimatedBonusContribution: 0,
    ratio: 0,
  },
]

function toNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") return fallback
  const num = Number(String(value).replace(/[^\d.-]/g, ""))
  return Number.isNaN(num) ? fallback : num
}

function parseDurationToMinutes(value) {
  if (value === undefined || value === null || value === "") return 0

  if (typeof value === "number") {
    if (value > 0 && value < 10) return Math.round(value * 24 * 60)
    return Math.round(value)
  }

  const text = String(value).trim().toLowerCase()

  const hmMatch = text.match(/(\d+)\s*h\s*(\d+)\s*m/)
  if (hmMatch) return Number(hmMatch[1]) * 60 + Number(hmMatch[2])

  const hOnlyMatch = text.match(/(\d+)\s*h/)
  if (hOnlyMatch) return Number(hOnlyMatch[1]) * 60

  const mOnlyMatch = text.match(/(\d+)\s*m/)
  if (mOnlyMatch) return Number(mOnlyMatch[1])

  const colonMatch = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (colonMatch) return Number(colonMatch[1]) * 60 + Number(colonMatch[2])

  return 0
}

function formatMinutes(minutes) {
  const safeMinutes = Math.max(0, Number(minutes) || 0)
  const hrs = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  return `${hrs}h ${mins}m`
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

function isQualified(creator) {
  return (
    creator.validLiveDays >= INCENTIVE_DAYS_TARGET &&
    creator.liveMinutes >= INCENTIVE_HOURS_TARGET * 60
  )
}

function getDaysProgress(days) {
  return Math.min((days / INCENTIVE_DAYS_TARGET) * 100, 100)
}

function getHoursProgress(minutes) {
  return Math.min((minutes / (INCENTIVE_HOURS_TARGET * 60)) * 100, 100)
}

function getDaysRemaining(days) {
  return Math.max(INCENTIVE_DAYS_TARGET - days, 0)
}

function getHoursRemaining(minutes) {
  return Math.max(INCENTIVE_HOURS_TARGET * 60 - minutes, 0)
}

function getStatusText(creator) {
  return isQualified(creator) ? "Qualified for incentive" : "Not qualified yet"
}

function normalizeCreator(row, index) {
  const creatorId =
    row["Creator ID:"] ||
    row["Creator ID"] ||
    row.creatorId ||
    row["creator id"] ||
    ""

  const username =
    row["Creator's username"] ||
    row["Creator username"] ||
    row.username ||
    row.Username ||
    row.creator ||
    ""

  const diamonds = toNumber(row["Diamonds in L30D"] ?? row.Diamonds ?? row.diamonds ?? 0)

  const validLiveDays = toNumber(
    row["Valid go LIVE days in L30D"] ??
      row["Valid go LIVE days"] ??
      row.validLiveDays ??
      row["live days"] ??
      0
  )

  const liveMinutes = parseDurationToMinutes(
    row["LIVE duration in L30D"] ??
      row["LIVE duration"] ??
      row.liveDuration ??
      row["live duration"] ??
      0
  )

  const eligibleIncentiveDays = toNumber(
    row["Eligible incentive days"] ??
      row.eligibleIncentiveDays ??
      row["eligible days"] ??
      0
  )

  const level = row.Level || row.level || "Level 1"

  const estimatedBonusContribution = toNumber(
    row["Estimated bonus contribution"] ?? row.estimatedBonusContribution ?? 0
  )

  const ratio = toNumber(row.Ratio ?? row.ratio ?? 0)

  return {
    id: index + 1,
    creatorId: String(creatorId),
    username: String(username).trim(),
    avatar: "/logo.png",
    diamonds,
    validLiveDays,
    liveMinutes,
    eligibleIncentiveDays,
    level,
    estimatedBonusContribution,
    ratio,
  }
}

function downloadTemplate() {
  const rows = [
    {
      "Creator ID": "7614187880910471184",
      "Creator username": "example.creator",
      "Diamonds in L30D": 245,
      "Valid go LIVE days in L30D": 9,
      "LIVE duration in L30D": "21h 30m",
      "Eligible incentive days": 30,
      Level: "Level 1",
      "Estimated bonus contribution": 75.5,
      Ratio: 12,
    },
  ]

  const sheet = XLSX.utils.json_to_sheet(rows)
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, "Creators")
  XLSX.writeFile(book, "creator-import-template.xlsx")
}

function GlassPanel({ title, text }) {
  return (
    <div style={styles.glassPanel}>
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>{title}</h3>
      <div style={styles.lightText}>{text}</div>
    </div>
  )
}

function StatCard({ title, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{title}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  )
}

function Panel({ children }) {
  return <div style={styles.panel}>{children}</div>
}

function ProgressBar({ value }) {
  return (
    <div style={styles.progressTrack}>
      <div style={{ ...styles.progressFill, width: `${value}%` }} />
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return isMobile
}

function ImportToolbar({ onImportClick, onDownloadTemplate, onResetData, isMobile }) {
  return (
    <div
      style={{
        ...styles.importToolbarWrap,
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
      }}
    >
      <div>
        <div style={styles.topBarTitle}>Platinum Pulse Network</div>
        <div style={styles.topBarSub}>Import creator data from Excel or CSV</div>
      </div>

      <div
        style={{
          ...styles.importToolbar,
          width: isMobile ? "100%" : "auto",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <button onClick={onImportClick} style={styles.importButton}>
          Import Creators
        </button>
        <button onClick={onDownloadTemplate} style={styles.secondaryNavButton}>
          Download Template
        </button>
        <button onClick={onResetData} style={styles.secondaryNavButton}>
          Reset Data
        </button>
      </div>
    </div>
  )
}

export default function Page() {
  const isMobile = useIsMobile()
  const [creators, setCreators] = useState(defaultCreators)
  const [username, setUsername] = useState("")
  const [selectedCreator, setSelectedCreator] = useState(null)
  const [error, setError] = useState("")
  const [importError, setImportError] = useState("")
  const [importSuccess, setImportSuccess] = useState("")
  const [view, setView] = useState("login")
  const [leaderboardSearch, setLeaderboardSearch] = useState("")
  const fileInputRef = useRef(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCreators(parsed)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creators))
  }, [creators])

  const leaderboard = useMemo(() => {
    return [...creators]
      .sort((a, b) => b.diamonds - a.diamonds)
      .map((creator, index) => ({
        ...creator,
        rank: index + 1,
      }))
  }, [creators])

  const filteredLeaderboard = leaderboard.filter((creator) =>
    creator.username.toLowerCase().includes(leaderboardSearch.trim().toLowerCase())
  )

  function handleLookup() {
    const found = creators.find(
      (creator) => creator.username.toLowerCase() === username.trim().toLowerCase()
    )

    if (!found) {
      setSelectedCreator(null)
      setError("Username not found. Please check spelling and try again.")
      return
    }

    setSelectedCreator(found)
    setError("")
    setView("dashboard")
  }

  function handleLogout() {
    setSelectedCreator(null)
    setUsername("")
    setError("")
    setView("login")
  }

  function openImporter() {
    setImportError("")
    setImportSuccess("")
    fileInputRef.current?.click()
  }

  function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError("")
    setImportSuccess("")

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: "array" })
        const firstSheetName = workbook.SheetNames[0]
        const firstSheet = workbook.Sheets[firstSheetName]
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" })

        const parsed = rows
          .map((row, index) => normalizeCreator(row, index))
          .filter((row) => row.username)

        if (!parsed.length) {
          setImportError("No valid creator rows found in the file.")
          return
        }

        setCreators(parsed)
        setSelectedCreator(null)
        setUsername("")
        setError("")
        setView("login")
        setImportSuccess(`${parsed.length} creators imported successfully.`)
      } catch {
        setImportError("Could not read that file. Upload a valid XLSX, XLS, or CSV export.")
      } finally {
        event.target.value = ""
      }
    }

    reader.readAsArrayBuffer(file)
  }

  function resetToDemoData() {
    localStorage.removeItem(STORAGE_KEY)
    setCreators(defaultCreators)
    setSelectedCreator(null)
    setUsername("")
    setError("")
    setImportError("")
    setImportSuccess("Demo data restored.")
    setView("login")
    setLeaderboardSearch("")
  }

  function renderPage(content) {
    return (
      <main
        style={{
          ...styles.page,
          padding: isMobile ? 10 : 24,
        }}
      >
        <div style={styles.backgroundGlowOne} />
        <div style={styles.backgroundGlowTwo} />

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        <div style={styles.container}>
          {importError ? <div style={styles.errorBox}>{importError}</div> : null}
          {importSuccess ? <div style={styles.successBox}>{importSuccess}</div> : null}

          {view !== "login" ? (
            <div
              style={{
                ...styles.navBar,
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <div style={styles.navBrand}>
                <img src="/logo.png" alt="Platinum Pulse Network" style={styles.navLogo} />
                <div>
                  <div style={styles.navBrandTitle}>Platinum Pulse Network</div>
                  <div style={styles.navBrandSub}>Creator Portal</div>
                </div>
              </div>

              <div
                style={{
                  ...styles.navButtons,
                  width: isMobile ? "100%" : "auto",
                }}
              >
                <button onClick={() => setView("dashboard")} style={styles.navButton}>
                  Dashboard
                </button>
                <button onClick={() => setView("leaderboard")} style={styles.navButton}>
                  Leaderboard
                </button>
                <button onClick={() => setView("incentives")} style={styles.navButton}>
                  Incentives
                </button>
                <button onClick={handleLogout} style={styles.navButton}>
                  Logout
                </button>
              </div>
            </div>
          ) : null}

          {content}
        </div>
      </main>
    )
  }

  if (view === "login") {
    return renderPage(
      <div
        style={{
          ...styles.heroCard,
          width: "100%",
          boxSizing: "border-box",
          margin: isMobile ? "24px auto 0" : "90px auto 0",
          borderRadius: isMobile ? 24 : 36,
          padding: isMobile ? "28px 18px" : "54px 42px",
        }}
      >
        <div style={styles.heroTop}>
          <img
            src="/logo.png"
            alt="Platinum Pulse Network"
            style={{
              ...styles.heroLogo,
              height: isMobile ? 120 : 170,
              width: isMobile ? 120 : 170,
            }}
          />
          <div style={styles.heroBadge}>Creator Portal</div>
        </div>

        <h1
          style={{
            ...styles.heroTitle,
            fontSize: isMobile ? 42 : 62,
            letterSpacing: isMobile ? "-1px" : "-2px",
            lineHeight: isMobile ? 1.05 : 1.02,
          }}
        >
          Platinum Pulse Network
        </h1>

        <p
          style={{
            ...styles.heroText,
            fontSize: isMobile ? 16 : 22,
          }}
        >
          Enter your username to access your personal dashboard, or import a fresh creator export above.
        </p>

        <div
          style={{
            ...styles.loginRow,
            flexDirection: isMobile ? "column" : "row",
            marginTop: isMobile ? 24 : 34,
            alignItems: "stretch",
          }}
        >
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLookup()
            }}
            placeholder="Enter your username"
            style={{
              ...styles.loginInput,
              maxWidth: isMobile ? "100%" : 500,
              fontSize: isMobile ? 16 : 18,
              padding: isMobile ? "16px 18px" : "18px 20px",
            }}
          />
          <button
            onClick={handleLookup}
            style={{
              ...styles.primaryButton,
              width: isMobile ? "100%" : "auto",
              fontSize: isMobile ? 16 : 18,
              padding: isMobile ? "16px 20px" : "18px 28px",
            }}
          >
            Enter Dashboard
          </button>
        </div>

        {error ? <div style={styles.errorBox}>{error}</div> : null}
      </div>
    )
  }

  if (view === "incentives") {
    return renderPage(
      <div style={{ ...styles.pageCard, padding: isMobile ? 16 : 30, width: "100%", boxSizing: "border-box" }}>
        <div style={styles.pageHeaderWithToolbar}>
          <div
            style={{
              ...styles.pageHeader,
              marginBottom: isMobile ? 12 : 24,
            }}
          >
            <img
              src="/logo.png"
              alt="Platinum Pulse Network"
              style={{
                ...styles.pageLogo,
                width: isMobile ? 82 : 120,
                height: isMobile ? 82 : 120,
              }}
            />
            <div>
              <div style={styles.pageKicker}>Platinum Pulse Network</div>
              <h1 style={{ ...styles.pageTitle, fontSize: isMobile ? 30 : 42 }}>
                How Incentives Work
              </h1>
            </div>
          </div>

          <ImportToolbar
            onImportClick={openImporter}
            onDownloadTemplate={downloadTemplate}
            onResetData={resetToDemoData}
            isMobile={isMobile}
          />
        </div>

        <div
          style={{
            ...styles.cardGrid,
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          <GlassPanel title="Incentive Period" text={`${INCENTIVE_PERIOD_DAYS} day incentive cycle.`} />
          <GlassPanel
            title="Minimum LIVE Days"
            text={`Creators must complete at least ${INCENTIVE_DAYS_TARGET} valid LIVE days.`}
          />
          <GlassPanel
            title="Minimum LIVE Hours"
            text={`Creators must complete at least ${INCENTIVE_HOURS_TARGET} LIVE hours.`}
          />
          <GlassPanel
            title="Qualification"
            text="A creator qualifies when both the LIVE day and LIVE hour requirements are completed."
          />
        </div>

        <div style={styles.largeGlassPanel}>
          <h2 style={{ marginTop: 0 }}>Tracked Metrics</h2>
          <p style={styles.lightText}>
            The portal tracks diamonds, LIVE duration, valid LIVE days, eligible incentive days,
            creator level, and current qualification status.
          </p>
        </div>
      </div>
    )
  }

  if (view === "leaderboard") {
    return renderPage(
      <div style={{ ...styles.pageCard, padding: isMobile ? 18 : 30 }}>
        <div style={styles.pageHeader}>
          <img
            src="/logo.png"
            alt="Platinum Pulse Network"
            style={{
              ...styles.pageLogo,
              width: isMobile ? 82 : 120,
              height: isMobile ? 82 : 120,
            }}
          />
          <div>
            <div style={styles.pageKicker}>Platinum Pulse Network</div>
            <h1 style={{ ...styles.pageTitle, fontSize: isMobile ? 30 : 42 }}>Public Leaderboard</h1>
          </div>
        </div>

        <div style={styles.leaderboardSearchWrap}>
          <input
            value={leaderboardSearch}
            onChange={(e) => setLeaderboardSearch(e.target.value)}
            placeholder="Search your username"
            style={styles.leaderboardSearchInput}
          />
        </div>

        <div style={styles.leaderboardWrap}>
          {filteredLeaderboard.length ? (
            filteredLeaderboard.map((creator) => (
              <div
                key={creator.id}
                style={{
                  ...styles.leaderboardRow,
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "90px minmax(220px, 1fr) minmax(380px, 2fr)",
                }}
              >
                <div style={styles.rankCircle}>#{creator.rank}</div>

                <div style={styles.leaderboardIdentityNoAvatar}>
                  <div>
                    <div style={styles.leaderboardName}>@{creator.username}</div>
                    <div style={styles.leaderboardMeta}>{creator.level}</div>
                  </div>
                </div>

                <div
                  style={{
                    ...styles.leaderboardStats,
                    gridTemplateColumns: isMobile ? "repeat(2, minmax(90px, 1fr))" : "repeat(4, minmax(90px, 1fr))",
                  }}
                >
                  <div style={styles.lbStat}>
                    <span style={styles.lbLabel}>Diamonds</span>
                    <strong>{creator.diamonds}</strong>
                  </div>
                  <div style={styles.lbStat}>
                    <span style={styles.lbLabel}>LIVE Days</span>
                    <strong>{creator.validLiveDays}</strong>
                  </div>
                  <div style={styles.lbStat}>
                    <span style={styles.lbLabel}>LIVE Hours</span>
                    <strong>{formatMinutes(creator.liveMinutes)}</strong>
                  </div>
                  <div style={styles.lbStat}>
                    <span style={styles.lbLabel}>Status</span>
                    <strong>{getStatusText(creator)}</strong>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>No users found for that search.</div>
          )}
        </div>
      </div>
    )
  }

  const creator = selectedCreator || creators[0]
  const qualified = isQualified(creator)
  const daysRemaining = getDaysRemaining(creator.validLiveDays)
  const hoursRemaining = getHoursRemaining(creator.liveMinutes)
  const hoursRemainingText = formatMinutes(hoursRemaining)

  return renderPage(
    <div style={{ ...styles.pageCard, padding: isMobile ? 18 : 30 }}>
      <div style={styles.pageHeader}>
        <img
          src="/logo.png"
          alt="Platinum Pulse Network"
          style={{
            ...styles.pageLogo,
            width: isMobile ? 82 : 120,
            height: isMobile ? 82 : 120,
          }}
        />
        <div>
          <div style={styles.pageKicker}>Platinum Pulse Network</div>
          <h1 style={{ ...styles.pageTitle, fontSize: isMobile ? 30 : 42 }}>Personal Dashboard</h1>
        </div>
      </div>

      <div
        style={{
          ...styles.statsGrid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <StatCard title="Username" value={`@${creator.username}`} />
        <StatCard title="Diamonds" value={creator.diamonds} />
        <StatCard title="Valid LIVE Days" value={`${creator.validLiveDays} / ${INCENTIVE_DAYS_TARGET}`} />
        <StatCard title="LIVE Duration" value={`${formatMinutes(creator.liveMinutes)} / ${INCENTIVE_HOURS_TARGET}h`} />
      </div>

      <div
        style={{
          ...styles.twoColGrid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <Panel>
          <h2 style={{ marginTop: 0 }}>Incentive Status</h2>
          <div
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 999,
              background: qualified ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)",
              color: qualified ? "#bbf7d0" : "#fecaca",
              fontWeight: "bold",
              border: qualified
                ? "1px solid rgba(34,197,94,0.25)"
                : "1px solid rgba(239,68,68,0.22)",
            }}
          >
            {getStatusText(creator)}
          </div>

          <div style={styles.infoList}>
            <div>
              <strong>Incentive period:</strong> {INCENTIVE_PERIOD_DAYS} days
            </div>
            <div>
              <strong>Creator level:</strong> {creator.level}
            </div>
            <div>
              <strong>Eligible incentive days:</strong> {creator.eligibleIncentiveDays}d
            </div>
            <div>
              <strong>Estimated bonus contribution:</strong> {formatCurrency(creator.estimatedBonusContribution)}
            </div>
            <div>
              <strong>Ratio:</strong> {creator.ratio}%
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 style={{ marginTop: 0 }}>Requirement Summary</h2>
          <div style={styles.infoList}>
            <div>
              <strong>Minimum LIVE days:</strong> {INCENTIVE_DAYS_TARGET}
            </div>
            <div>
              <strong>Minimum LIVE hours:</strong> {INCENTIVE_HOURS_TARGET} hours
            </div>
            <div>
              <strong>Days still needed:</strong> {daysRemaining}
            </div>
            <div>
              <strong>Hours still needed:</strong> {hoursRemainingText}
            </div>
          </div>
        </Panel>
      </div>

      <div
        style={{
          ...styles.threeColGrid,
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))",
        }}
      >
        <Panel>
          <h2 style={{ marginTop: 0 }}>LIVE Days Progress</h2>
          <div style={styles.mutedText}>
            {creator.validLiveDays} / {INCENTIVE_DAYS_TARGET} days
          </div>
          <ProgressBar value={getDaysProgress(creator.validLiveDays)} />
          <div style={styles.progressText}>
            {daysRemaining === 0
              ? "LIVE day requirement completed."
              : `${daysRemaining} more day${daysRemaining === 1 ? "" : "s"} needed.`}
          </div>
        </Panel>

        <Panel>
          <h2 style={{ marginTop: 0 }}>LIVE Duration Progress</h2>
          <div style={styles.mutedText}>
            {formatMinutes(creator.liveMinutes)} / {INCENTIVE_HOURS_TARGET}h
          </div>
          <ProgressBar value={getHoursProgress(creator.liveMinutes)} />
          <div style={styles.progressText}>
            {hoursRemaining === 0
              ? "LIVE duration requirement completed."
              : `${hoursRemainingText} more needed.`}
          </div>
        </Panel>

        <Panel>
          <h2 style={{ marginTop: 0 }}>Diamonds</h2>
          <div style={styles.bigNumber}>{creator.diamonds}</div>
          <div style={styles.progressText}>
            Diamonds are tracked for ranking and creator performance.
          </div>
        </Panel>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box",
    background:
      "linear-gradient(rgba(3,7,18,0.52), rgba(2,6,23,0.84)), url('/background.png') center/cover no-repeat",
    color: "white",
    fontFamily: "Arial, sans-serif",
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  backgroundGlowOne: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(34,211,238,0.14), transparent 70%)",
    top: -120,
    left: -80,
    pointerEvents: "none",
  },
  backgroundGlowTwo: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(59,130,246,0.14), transparent 70%)",
    bottom: -180,
    right: -120,
    pointerEvents: "none",
  },
  container: {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
    boxSizing: "border-box",
  },
  importToolbarWrap: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 18,
    padding: "16px 18px",
    borderRadius: 22,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(12px)",
  },
  topBarTitle: {
    fontWeight: "bold",
    color: "#e0f2fe",
  },
  topBarSub: {
    color: "#bfdbfe",
    fontSize: 14,
    marginTop: 4,
  },
  importToolbar: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  importButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)",
    color: "#062033",
    cursor: "pointer",
    fontWeight: "bold",
  },
  secondaryNavButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },
  successBox: {
    marginBottom: 18,
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(34,197,94,0.14)",
    border: "1px solid rgba(34,197,94,0.25)",
    color: "#bbf7d0",
  },
  heroCard: {
    width: "100%",
    maxWidth: 880,
    boxSizing: "border-box",
    borderRadius: 36,
    padding: "54px 42px",
    background: "linear-gradient(180deg, rgba(10,25,61,0.72), rgba(7,18,42,0.68))",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: "0 30px 100px rgba(0,0,0,0.35)",
    textAlign: "center",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  },
  heroTop: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  heroLogo: {
    objectFit: "contain",
    marginBottom: 14,
    filter: "drop-shadow(0 0 20px rgba(103,232,249,0.35))",
  },
  heroBadge: {
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#dbeafe",
    fontSize: 14,
  },
  heroTitle: {
    margin: 0,
    textShadow: "0 10px 40px rgba(0,0,0,0.24)",
  },
  heroText: {
    margin: "18px auto 0",
    color: "#dbeafe",
    maxWidth: 700,
    lineHeight: 1.5,
  },
  loginRow: {
    display: "flex",
    gap: 14,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  loginInput: {
    width: "100%",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    outline: "none",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
  },
  primaryButton: {
    borderRadius: 18,
    border: "none",
    background: "linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)",
    color: "#062033",
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 10px 30px rgba(34,211,238,0.24)",
  },
  errorBox: {
    marginTop: 20,
    padding: "14px 16px",
    borderRadius: 16,
    background: "rgba(239,68,68,0.14)",
    border: "1px solid rgba(239,68,68,0.25)",
    color: "#fecaca",
    maxWidth: 720,
    marginLeft: "auto",
    marginRight: "auto",
  },
  navBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 22,
    padding: "18px 20px",
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(11,26,64,0.72), rgba(8,18,46,0.66))",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(14px)",
  },
  navBrand: {
    display: "flex",
    gap: 14,
    alignItems: "center",
  },
  navLogo: {
    width: 70,
    height: 70,
    objectFit: "contain",
  },
  navBrandTitle: {
    color: "#dbeafe",
    fontWeight: "bold",
  },
  navBrandSub: {
    color: "#bfdbfe",
    fontSize: 13,
  },
  navButtons: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  navButton: {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
    flex: "1 1 140px",
  },
  pageCard: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 32,
    background: "linear-gradient(180deg, rgba(10,25,61,0.72), rgba(7,18,42,0.68))",
    border: "1px solid rgba(255,255,255,0.12)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.30)",
  },
  pageHeaderWithToolbar: {
    display: "grid",
    gap: 20,
    marginBottom: 24,
  },
  pageHeader: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    marginBottom: 24,
    flexWrap: "wrap",
  },
  pageLogo: {
    objectFit: "contain",
    filter: "drop-shadow(0 0 16px rgba(103,232,249,0.25))",
  },
  pageKicker: {
    color: "#dbeafe",
    fontSize: 14,
    marginBottom: 6,
  },
  pageTitle: {
    margin: 0,
  },
  cardGrid: {
    display: "grid",
    gap: 18,
  },
  glassPanel: {
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(11,26,64,0.82), rgba(8,18,46,0.76))",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: 22,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  largeGlassPanel: {
    marginTop: 24,
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(11,26,64,0.82), rgba(8,18,46,0.76))",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: 24,
  },
  lightText: {
    color: "#dbeafe",
    lineHeight: 1.7,
  },
  statsGrid: {
    display: "grid",
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    borderRadius: 22,
    padding: 22,
    background: "linear-gradient(180deg, rgba(11,26,64,0.82), rgba(8,18,46,0.76))",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  statTitle: {
    color: "#bfdbfe",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: "bold",
  },
  twoColGrid: {
    display: "grid",
    gap: 16,
    marginBottom: 24,
  },
  threeColGrid: {
    display: "grid",
    gap: 16,
    marginBottom: 24,
  },
  panel: {
    borderRadius: 24,
    padding: 24,
    background: "linear-gradient(180deg, rgba(11,26,64,0.82), rgba(8,18,46,0.76))",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "white",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  },
  infoList: {
    marginTop: 18,
    color: "#dbeafe",
    lineHeight: 1.8,
  },
  mutedText: {
    color: "#bfdbfe",
    marginBottom: 10,
  },
  progressTrack: {
    width: "100%",
    height: 14,
    background: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #22d3ee 0%, #3b82f6 100%)",
    borderRadius: 999,
  },
  progressText: {
    marginTop: 10,
    color: "#bfdbfe",
  },
  bigNumber: {
    fontSize: 40,
    fontWeight: "bold",
    marginBottom: 10,
  },
  leaderboardSearchWrap: {
    marginBottom: 18,
  },
  leaderboardSearchInput: {
    width: "100%",
    maxWidth: 420,
    padding: "16px 18px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontSize: 16,
    outline: "none",
  },
  leaderboardWrap: {
    display: "grid",
    gap: 14,
  },
  leaderboardRow: {
    display: "grid",
    gap: 16,
    alignItems: "center",
    background: "linear-gradient(180deg, rgba(11,26,64,0.82), rgba(8,18,46,0.76))",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 22,
    padding: 18,
  },
  rankCircle: {
    height: 64,
    width: 64,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #67e8f9 0%, #2563eb 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: 18,
    color: "white",
    boxShadow: "0 10px 30px rgba(37,99,235,0.25)",
  },
  leaderboardIdentityNoAvatar: {
    display: "flex",
    alignItems: "center",
    minHeight: 56,
  },
  leaderboardName: {
    fontWeight: "bold",
    fontSize: 18,
  },
  leaderboardMeta: {
    color: "#bfdbfe",
    fontSize: 14,
    marginTop: 4,
  },
  leaderboardStats: {
    display: "grid",
    gap: 12,
  },
  lbStat: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  lbLabel: {
    color: "#bfdbfe",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  emptyState: {
    padding: 24,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#dbeafe",
    textAlign: "center",
  },
}

