export * from './lib'

import '@nop-chaos/nop-amis-vue/lib/style.css'
import 'element-plus/dist/index.css'
import '../../policy-studio/dist/style.css'

import './fix.css'

import * as SdkLib from './lib'

SdkLib.registerModule("@nop-chaos/sdk", SdkLib)
