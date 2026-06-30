import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { ParentLayout, KidLayout } from './components/Layouts'

// Parent screens
import { Onboarding } from './pages/parent/Onboarding'
import { AddChild } from './pages/parent/AddChild'
import { ParentHome } from './pages/parent/ParentHome'
import { TaskLibrary } from './pages/parent/TaskLibrary'
import { RewardMenu } from './pages/parent/RewardMenu'
import { ApproveTask } from './pages/parent/ApproveTask'
import { RewardFulfil } from './pages/parent/RewardFulfil'
import { Insights } from './pages/parent/Insights'
import { WeeklyDigest } from './pages/parent/WeeklyDigest'
import { FamilyCircle } from './pages/parent/FamilyCircle'
import { GiftPoints } from './pages/parent/GiftPoints'
import { Children } from './pages/parent/Children'
import { Upgrade } from './pages/parent/Upgrade'

// Kid screens
import { MyDay } from './pages/kid/MyDay'
import { DoTask } from './pages/kid/DoTask'
import { Celebrate } from './pages/kid/Celebrate'
import { MyJar } from './pages/kid/MyJar'
import { GardenWorld } from './pages/kid/GardenWorld'
import { RewardsShelf } from './pages/kid/RewardsShelf'

export default function App() {
  const onboarded = useStore((s) => s.data.onboarded)

  return (
    <Routes>
      <Route path="/" element={<Navigate to={onboarded ? '/parent' : '/onboarding'} replace />} />

      {/* Onboarding lives outside the tab layouts */}
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/parent/add-child" element={<AddChild />} />

      {/* Parent world */}
      <Route element={<ParentLayout />}>
        <Route path="/parent" element={<ParentHome />} />
        <Route path="/parent/tasks" element={<TaskLibrary />} />
        <Route path="/parent/rewards" element={<RewardMenu />} />
        <Route path="/parent/approve/:taskId" element={<ApproveTask />} />
        <Route path="/parent/reward/:rewardId" element={<RewardFulfil />} />
        <Route path="/parent/insights" element={<Insights />} />
        <Route path="/parent/digest" element={<WeeklyDigest />} />
        <Route path="/parent/circle" element={<FamilyCircle />} />
        <Route path="/parent/gift" element={<GiftPoints />} />
        <Route path="/parent/children" element={<Children />} />
        <Route path="/parent/upgrade" element={<Upgrade />} />
      </Route>

      {/* Kid world */}
      <Route element={<KidLayout />}>
        <Route path="/kid" element={<MyDay />} />
        <Route path="/kid/task/:taskId" element={<DoTask />} />
        <Route path="/kid/celebrate" element={<Celebrate />} />
        <Route path="/kid/jar" element={<MyJar />} />
        <Route path="/kid/garden" element={<GardenWorld />} />
        <Route path="/kid/rewards" element={<RewardsShelf />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
