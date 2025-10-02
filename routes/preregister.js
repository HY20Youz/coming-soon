import { Router } from 'express'
import PreRegister from '../models/PreRegister.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' })
    }
    const exists = await PreRegister.findOne({ email })
    if (exists) {
      return res.status(200).json({ message: 'You are already pre-registered' })
    }
    await PreRegister.create({ email })
    return res.json({ message: 'Pre-registration successful. We will contact you before launch.' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Server error' })
  }
})

export default router
