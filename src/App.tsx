import { Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from './store'
import { ParentLayout, KidLayout } from './ui/Layouts'

// Parent screens
import { Onboarding } from './features/parent/Onboarding'
import { AddChild } from './features/parent/AddChild'
import { ParentHome } from './features/parent/ParentHome'
import { TaskLibrary } from './features/parent/TaskLibrary'
import { RewardMenu } from './features/parent/RewardMenu'
import { ApproveTask } from './features/parent/ApproveTask'
import { RewardFulfil } from './features/parent/RewardFulfil'
import { Insights } from './features/parent/Insights'
import { WeeklyDigest } from './features/parent/WeeklyDigest'
import { FamilyCircle } from './features/parent/FamilyCircle'
import { GiftPoints } from './features/parent/GiftPoints'
import { Children } from './features/parent/Children'
import { Upgrade } from './features/parent/Upgrade'
import { GrowthAlbum } from './features/parent/GrowthAlbum'
import { FamilyStory } from './features/parent/FamilyStory'
import { JarSettings } from './features/parent/JarSettings'
import { More } from './features/parent/More'

// Kid screens
import { MyDay } from './features/kid/MyDay'
import { DoTask } from './features/kid/DoTask'
import { Celebrate } from './features/kid/Celebrate'
import { MyJar } from './features/kid/MyJar'
import { GardenWorld } from './features/kid/GardenWorld'
import { RewardsShelf } from './features/kid/RewardsShelf'

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
        <Route path="/parent/story" element={<FamilyStory />} />
        <Route path="/parent/album" element={<GrowthAlbum />} />
        <Route path="/parent/jars" element={<JarSettings />} />
        <Route path="/parent/circle" element={<FamilyCircle />} />
        <Route path="/parent/gift" element={<GiftPoints />} />
        <Route path="/parent/children" element={<Children />} />
        <Route path="/parent/more" element={<More />} />
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
