import { Router } from 'express'
import PreRegister from '../models/PreRegister.js'
import GameWallet from '../models/GameWallet.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' })
    }

    // تأكد من وجود سجل pre-register
    const exists = await PreRegister.findOne({ email })
    if (!exists) {
      await PreRegister.create({ email })
    }

    // تأكد من وجود محفظة، وأعد الرصيد
    let wallet = await GameWallet.findOne({ email })
    if (!wallet) wallet = await GameWallet.create({ email, balanceCents: 0 })

    return res.json({
      message: exists ? 'You are already pre-registered' : 'Pre-registration successful. We will contact you before launch.',
      email,
      alreadyRegistered: !!exists,
      balanceCents: wallet.balanceCents || 0
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: 'Server error' })
  }
})

export default router
