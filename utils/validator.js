import { PHONE_REGEX, FORBIDDEN_TEXT_PATTERNS, VALIDATION_LIMITS } from '@/utils/constants'

/**
 * 表单验证工具
 */

/**
 * 验证手机号
 * @param {string} phone - 手机号
 * @returns {boolean}
 */
export function validatePhone(phone) {
  return PHONE_REGEX.test(phone)
}

/**
 * 验证微信号
 * @param {string} wechat - 微信号
 * @returns {boolean}
 */
export function validateWechat(wechat) {
  // 微信号规则：6-20位，字母、数字、下划线、减号
  const reg = /^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/
  return reg.test(wechat)
}

/**
 * 验证邮箱
 * @param {string} email - 邮箱
 * @returns {boolean}
 */
export function validateEmail(email) {
  const reg = /^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/
  return reg.test(email)
}

/**
 * 简单的 XSS 关键字拦截
 * @param {string} value
 * @returns {boolean} - true 表示文本安全
 */
export function validateSafeText(value = '') {
  if (typeof value !== 'string') {
    return true
  }
  const lower = value.toLowerCase()
  return !FORBIDDEN_TEXT_PATTERNS.some(pattern => lower.includes(pattern))
}

/**
 * 验证非空
 * @param {*} value - 值
 * @returns {boolean}
 */
export function validateRequired(value) {
  if (typeof value === 'string') {
    return value.trim() !== ''
  }
  if (Array.isArray(value)) {
    return value.length > 0
  }
  return value !== null && value !== undefined
}

/**
 * 验证字符串长度
 * @param {string} str - 字符串
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @returns {boolean}
 */
export function validateLength(str, min, max) {
  const len = str ? str.trim().length : 0
  return len >= min && len <= max
}

/**
 * 验证报名信息表单
 * @param {object} formData - 表单数据
 * @returns {object} { valid: boolean, message: string }
 */
export function validateRegistrationForm(formData) {
  const { name, phone, role } = formData

  if (!validateRequired(name)) {
    return { valid: false, message: '请输入您的称呼' }
  }

  if (!validateLength(name, 2, 20)) {
    return { valid: false, message: '称呼长度应在2-20个字符之间' }
  }

  if (!validateRequired(phone)) {
    return { valid: false, message: '请输入联系电话' }
  }

  if (!validatePhone(phone)) {
    return { valid: false, message: '请输入正确的手机号' }
  }

  if (!validateRequired(role)) {
    return { valid: false, message: '请选择您的身份' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证项目发布表单
 * @param {object} formData - 表单数据
 * @returns {object} { valid: boolean, message: string }
 */
export function validateProjectForm(formData) {
  const {
    logo,
    projectName = '',
    registeredEntity = '',
    oneLiner = '',
    track,
    introduction = '',
    description = '',
    coreCompetitiveness = '',
    category,
    tags = [],
    contactPhone
  } = formData

  if (!validateRequired(logo)) {
    return { valid: false, message: '请上传项目Logo' }
  }

  if (!validateRequired(projectName)) {
    return { valid: false, message: '请输入项目名称' }
  }

  if (!validateSafeText(projectName)) {
    return { valid: false, message: '项目名称包含非法字符' }
  }

  if (projectName.trim().length > VALIDATION_LIMITS.projectNameMax) {
    return { valid: false, message: '项目名称不能超过50个字符' }
  }

  if (!validateRequired(registeredEntity)) {
    return { valid: false, message: '请输入已注册主体' }
  }

  if (registeredEntity.trim().length > VALIDATION_LIMITS.registeredEntityMax) {
    return { valid: false, message: '已注册主体不能超过50个字符' }
  }

  if (!validateSafeText(registeredEntity)) {
    return { valid: false, message: '已注册主体包含非法字符' }
  }

  if (!validateRequired(oneLiner)) {
    return { valid: false, message: '请输入一句话介绍' }
  }

  if (oneLiner.trim().length > VALIDATION_LIMITS.oneLinerMax) {
    return { valid: false, message: '一句话介绍不能超过100个字符' }
  }

  if (!validateSafeText(oneLiner)) {
    return { valid: false, message: '一句话介绍包含非法字符' }
  }

  if (!validateRequired(track) || track.length === 0) {
    return { valid: false, message: '请至少选择一个项目赛道' }
  }

  if (!validateRequired(introduction)) {
    return { valid: false, message: '请输入项目介绍' }
  }

  if (introduction.trim().length > VALIDATION_LIMITS.introductionMax) {
    return { valid: false, message: '项目介绍不能超过500个字符' }
  }

  if (!validateSafeText(introduction)) {
    return { valid: false, message: '项目介绍包含非法字符' }
  }

  if (!validateRequired(description)) {
    return { valid: false, message: '请输入合作诉求' }
  }

  if (description.trim().length > VALIDATION_LIMITS.descriptionMax) {
    return { valid: false, message: '合作诉求不能超过500个字符' }
  }

  if (!validateSafeText(description)) {
    return { valid: false, message: '合作诉求包含非法字符' }
  }

  if (!validateRequired(coreCompetitiveness)) {
    return { valid: false, message: '请输入核心竞争力' }
  }

  if (coreCompetitiveness.trim().length > VALIDATION_LIMITS.coreCompetitivenessMax) {
    return { valid: false, message: '核心竞争力不能超过300个字符' }
  }

  if (!validateSafeText(coreCompetitiveness)) {
    return { valid: false, message: '核心竞争力包含非法字符' }
  }

  if (!validateRequired(category)) {
    return { valid: false, message: '请选择项目类别' }
  }

  if (!validateRequired(tags) || tags.length === 0) {
    return { valid: false, message: '请至少添加一个项目标签' }
  }

  const unsafeTag = tags.find(tag => !validateSafeText(tag))
  if (unsafeTag) {
    return { valid: false, message: `标签“${unsafeTag}”包含非法字符` }
  }

  if (validateRequired(contactPhone)) {
    if (!validatePhone(contactPhone)) {
      return { valid: false, message: '联系电话格式不正确' }
    }
  }

  return { valid: true, message: '' }
}

/**
 * 验证兑换码
 * @param {string} code - 兑换码
 * @returns {object} { valid: boolean, message: string }
 */
export function validateRedeemCode(code) {
  if (!validateRequired(code)) {
    return { valid: false, message: '请输入兑换码' }
  }

  // 兑换码长度限制
  if (!validateLength(code, 1, 50)) {
    return { valid: false, message: '兑换码长度不正确' }
  }

  return { valid: true, message: '' }
}

